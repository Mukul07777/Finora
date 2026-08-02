import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentWallet } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const ONE_ETH = ethers.parseEther("1");
const PER_TX = ethers.parseEther("0.5");
const DAILY = ethers.parseEther("1");

describe("AgentWallet — hardening (guardians, dead-man, breaker, EIP-712)", () => {
  let owner: HardhatEthersSigner;
  let agent: HardhatEthersSigner;
  let vendor: HardhatEthersSigner;
  let guardian: HardhatEthersSigner;
  let monitor: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;
  let wallet: AgentWallet;

  beforeEach(async () => {
    [owner, agent, vendor, guardian, monitor, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AgentWallet", owner);
    wallet = await Factory.deploy(agent.address, PER_TX, DAILY);
    await wallet.waitForDeployment();
    await owner.sendTransaction({ to: await wallet.getAddress(), value: ONE_ETH * 10n });
    await wallet.connect(owner).setAllowlist(vendor.address, true);
  });

  describe("guardians (freeze-only)", () => {
    it("a guardian can pause but is not the owner", async () => {
      await wallet.connect(owner).setGuardian(guardian.address, true);
      await expect(wallet.connect(guardian).guardianPause()).to.emit(wallet, "Paused");
      expect(await wallet.paused()).to.equal(true);
    });

    it("a guardian cannot withdraw funds", async () => {
      await wallet.connect(owner).setGuardian(guardian.address, true);
      await expect(wallet.connect(guardian).withdraw(ONE_ETH)).to.be.revertedWithCustomError(
        wallet,
        "NotOwner"
      );
    });

    it("a non-guardian cannot pause via guardianPause", async () => {
      await expect(wallet.connect(stranger).guardianPause()).to.be.revertedWithCustomError(
        wallet,
        "NotGuardian"
      );
    });

    it("only the owner can appoint guardians", async () => {
      await expect(
        wallet.connect(stranger).setGuardian(guardian.address, true)
      ).to.be.revertedWithCustomError(wallet, "NotOwner");
    });
  });

  describe("automated circuit breaker", () => {
    it("the monitor trips the breaker at/above risk 80", async () => {
      await wallet.connect(owner).setMonitor(monitor.address);
      await expect(wallet.connect(monitor).tripBreaker(85))
        .to.emit(wallet, "CircuitBreakerTripped")
        .withArgs(monitor.address, 85);
      expect(await wallet.paused()).to.equal(true);
    });

    it("does not trip below the threshold", async () => {
      await wallet.connect(owner).setMonitor(monitor.address);
      await wallet.connect(monitor).tripBreaker(50);
      expect(await wallet.paused()).to.equal(false);
    });

    it("a random address cannot trip the breaker", async () => {
      await expect(wallet.connect(stranger).tripBreaker(99)).to.be.revertedWithCustomError(
        wallet,
        "NotMonitor"
      );
    });

    it("a tripped breaker blocks the agent's next payment", async () => {
      await wallet.connect(owner).setMonitor(monitor.address);
      await wallet.connect(monitor).tripBreaker(90);
      await expect(
        wallet.connect(agent).directPay(vendor.address, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(wallet, "ContractPaused");
    });
  });

  describe("dead-man switch", () => {
    it("agent spend expires if the owner stops sending heartbeats", async () => {
      await wallet.connect(owner).setHeartbeat(3600); // 1h timeout
      // still alive right now
      await expect(wallet.connect(agent).directPay(vendor.address, ethers.parseEther("0.1"))).to.not.be
        .reverted;
      await time.increase(3601);
      expect(await wallet.agentExpired()).to.equal(true);
      await expect(
        wallet.connect(agent).directPay(vendor.address, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(wallet, "AgentExpired");
    });

    it("a heartbeat resets the timer", async () => {
      await wallet.connect(owner).setHeartbeat(3600);
      await time.increase(3000);
      await wallet.connect(owner).heartbeat();
      await time.increase(1000); // 1000 < 3600 since last beat
      expect(await wallet.agentExpired()).to.equal(false);
      await expect(wallet.connect(agent).directPay(vendor.address, ethers.parseEther("0.1"))).to.not.be
        .reverted;
    });

    it("is disabled by default (no timeout set)", async () => {
      expect(await wallet.agentExpired()).to.equal(false);
    });
  });

  describe("EIP-712 delegated spend grants", () => {
    const domain = (verifyingContract: string, chainId: number) => ({
      name: "Finora AgentWallet",
      version: "1",
      chainId,
      verifyingContract,
    });
    const types = {
      SpendGrant: [
        { name: "agent", type: "address" },
        { name: "to", type: "address" },
        { name: "maxAmount", type: "uint256" },
        { name: "expiry", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    };

    async function makeGrant(overrides: Partial<Record<string, unknown>> = {}) {
      const net = await ethers.provider.getNetwork();
      const addr = await wallet.getAddress();
      const grant = {
        agent: agent.address,
        to: stranger.address, // NOT on the allowlist — the grant authorizes it
        maxAmount: ethers.parseEther("0.3"),
        expiry: (await time.latest()) + 3600,
        nonce: 1,
        ...overrides,
      };
      const sig = await owner.signTypedData(domain(addr, Number(net.chainId)), types, grant);
      return { grant, sig };
    }

    it("pays a grant-authorized counterparty when the owner signed it", async () => {
      const { grant, sig } = await makeGrant();
      await expect(
        wallet.connect(agent).payWithGrant(grant, sig, ethers.parseEther("0.2"))
      ).to.changeEtherBalance(stranger, ethers.parseEther("0.2"));
    });

    it("rejects a grant not signed by the owner", async () => {
      const { grant } = await makeGrant();
      const net = await ethers.provider.getNetwork();
      const addr = await wallet.getAddress();
      const forged = await stranger.signTypedData(domain(addr, Number(net.chainId)), types, grant);
      await expect(
        wallet.connect(agent).payWithGrant(grant, forged, ethers.parseEther("0.2"))
      ).to.be.revertedWithCustomError(wallet, "BadSignature");
    });

    it("rejects a replayed grant (nonce already used)", async () => {
      const { grant, sig } = await makeGrant();
      await wallet.connect(agent).payWithGrant(grant, sig, ethers.parseEther("0.1"));
      await expect(
        wallet.connect(agent).payWithGrant(grant, sig, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(wallet, "GrantAlreadyUsed");
    });

    it("rejects an expired grant", async () => {
      const { grant, sig } = await makeGrant({ expiry: (await time.latest()) - 1 });
      await expect(
        wallet.connect(agent).payWithGrant(grant, sig, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(wallet, "GrantExpired");
    });

    it("cannot exceed the grant's maxAmount", async () => {
      const { grant, sig } = await makeGrant();
      await expect(
        wallet.connect(agent).payWithGrant(grant, sig, ethers.parseEther("0.4"))
      ).to.be.revertedWithCustomError(wallet, "GrantExceeded");
    });

    it("a grant still cannot exceed the per-tx cap", async () => {
      const { grant, sig } = await makeGrant({ maxAmount: ethers.parseEther("0.9") });
      await expect(
        wallet.connect(agent).payWithGrant(grant, sig, ethers.parseEther("0.6"))
      ).to.be.revertedWithCustomError(wallet, "ExceedsPerTxLimit");
    });

    it("only the agent can submit a grant", async () => {
      const { grant, sig } = await makeGrant();
      await expect(
        wallet.connect(stranger).payWithGrant(grant, sig, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(wallet, "NotAgent");
    });
  });
});
