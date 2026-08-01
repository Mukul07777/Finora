import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentWallet } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const ONE_ETH = ethers.parseEther("1");
const PER_TX = ethers.parseEther("0.5");
const DAILY = ethers.parseEther("1");

describe("AgentWallet", () => {
  let owner: HardhatEthersSigner;
  let agent: HardhatEthersSigner;
  let vendor: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;
  let wallet: AgentWallet;

  beforeEach(async () => {
    [owner, agent, vendor, stranger] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("AgentWallet", owner);
    wallet = await Factory.deploy(agent.address, PER_TX, DAILY);
    await wallet.waitForDeployment();

    await owner.sendTransaction({ to: await wallet.getAddress(), value: ONE_ETH * 10n });
    await wallet.connect(owner).setAllowlist(vendor.address, true);
  });

  describe("identity & ownership", () => {
    it("sets the deployer as owner and the constructor arg as agent", async () => {
      expect(await wallet.owner()).to.equal(owner.address);
      expect(await wallet.agent()).to.equal(agent.address);
    });

    it("only the owner can change the agent (session key)", async () => {
      await expect(wallet.connect(stranger).setAgent(stranger.address)).to.be.revertedWithCustomError(
        wallet,
        "NotOwner"
      );
      await expect(wallet.connect(owner).setAgent(stranger.address)).to.not.be.reverted;
      expect(await wallet.agent()).to.equal(stranger.address);
    });

    it("only the owner can change policy or allowlist", async () => {
      await expect(
        wallet.connect(agent).setPolicy(ONE_ETH, ONE_ETH, 3600)
      ).to.be.revertedWithCustomError(wallet, "NotOwner");
      await expect(wallet.connect(agent).setAllowlist(vendor.address, true)).to.be.revertedWithCustomError(
        wallet,
        "NotOwner"
      );
    });
  });

  describe("direct payments — the agent's own logic never gets a vote", () => {
    it("allows a payment within policy to an allowlisted counterparty", async () => {
      const amount = ethers.parseEther("0.2");
      await expect(wallet.connect(agent).directPay(vendor.address, amount)).to.changeEtherBalance(
        vendor,
        amount
      );
    });

    it("blocks payment to a non-allowlisted counterparty, no matter how small", async () => {
      await expect(
        wallet.connect(agent).directPay(stranger.address, 1n)
      ).to.be.revertedWithCustomError(wallet, "NotAllowlisted");
    });

    it("blocks a payment above the per-transaction limit", async () => {
      const amount = PER_TX + 1n;
      await expect(wallet.connect(agent).directPay(vendor.address, amount)).to.be.revertedWithCustomError(
        wallet,
        "ExceedsPerTxLimit"
      );
    });

    it("blocks cumulative spend above the rolling daily limit", async () => {
      await wallet.connect(agent).directPay(vendor.address, PER_TX); // 0.5 / 1.0 spent
      await wallet.connect(agent).directPay(vendor.address, PER_TX); // 1.0 / 1.0 spent — at the edge
      await expect(wallet.connect(agent).directPay(vendor.address, 1n)).to.be.revertedWithCustomError(
        wallet,
        "ExceedsDailyLimit"
      );
    });

    it("rejects any spend attempt from an address that is not the current agent", async () => {
      await expect(
        wallet.connect(stranger).directPay(vendor.address, 1n)
      ).to.be.revertedWithCustomError(wallet, "NotAgent");
    });

    it("blocks all direct payments while paused, even within policy", async () => {
      await wallet.connect(owner).pause();
      await expect(
        wallet.connect(agent).directPay(vendor.address, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(wallet, "ContractPaused");
    });
  });

  describe("kill switch", () => {
    it("only the owner can pause or unpause", async () => {
      await expect(wallet.connect(agent).pause()).to.be.revertedWithCustomError(wallet, "NotOwner");
      await expect(wallet.connect(owner).pause()).to.not.be.reverted;
      expect(await wallet.paused()).to.equal(true);

      await expect(wallet.connect(agent).unpause()).to.be.revertedWithCustomError(wallet, "NotOwner");
      await wallet.connect(owner).unpause();
      expect(await wallet.paused()).to.equal(false);
    });
  });

  describe("in-flight revocation — freeze between propose() and execute()", () => {
    it("lets a proposed payment execute normally when nothing intervenes", async () => {
      const amount = ethers.parseEther("0.2");
      const tx = await wallet.connect(agent).proposePayment(vendor.address, amount);
      const receipt = await tx.wait();
      const id = 0n; // first payment id

      await expect(wallet.connect(agent).executePayment(id)).to.changeEtherBalance(vendor, amount);
      expect(receipt).to.not.be.undefined;
    });

    it("reverts execution if the owner freezes the agent after the payment was proposed", async () => {
      const amount = ethers.parseEther("0.2");
      await wallet.connect(agent).proposePayment(vendor.address, amount); // step 1: succeeds
      const id = 0n;

      await wallet.connect(owner).pause(); // owner hits the kill switch mid-sequence

      await expect(wallet.connect(agent).executePayment(id)).to.be.revertedWithCustomError(
        wallet,
        "ContractPaused"
      ); // step 2: blocked — no funds ever move for this proposal

      expect((await wallet.pendingPayments(id)).executed).to.equal(false);
    });

    it("re-validates the allowlist at execution time, not just at proposal time", async () => {
      const amount = ethers.parseEther("0.1");
      await wallet.connect(agent).proposePayment(vendor.address, amount);
      const id = 0n;

      await wallet.connect(owner).setAllowlist(vendor.address, false); // owner revokes mid-flight

      await expect(wallet.connect(agent).executePayment(id)).to.be.revertedWithCustomError(
        wallet,
        "NotAllowlisted"
      );
    });

    it("cannot execute the same payment twice", async () => {
      const amount = ethers.parseEther("0.1");
      await wallet.connect(agent).proposePayment(vendor.address, amount);
      const id = 0n;
      await wallet.connect(agent).executePayment(id);

      await expect(wallet.connect(agent).executePayment(id)).to.be.revertedWithCustomError(
        wallet,
        "PaymentAlreadyFinalized"
      );
    });

    it("lets the owner or agent cancel a pending payment before it executes", async () => {
      const amount = ethers.parseEther("0.1");
      await wallet.connect(agent).proposePayment(vendor.address, amount);
      const id = 0n;

      await wallet.connect(owner).cancelPayment(id);
      await expect(wallet.connect(agent).executePayment(id)).to.be.revertedWithCustomError(
        wallet,
        "PaymentAlreadyFinalized"
      );
    });
  });

  describe("funds custody", () => {
    it("lets anyone deposit via a plain transfer", async () => {
      const before = await wallet.balance();
      await stranger.sendTransaction({ to: await wallet.getAddress(), value: ONE_ETH });
      expect(await wallet.balance()).to.equal(before + ONE_ETH);
    });

    it("only the owner can withdraw", async () => {
      await expect(wallet.connect(agent).withdraw(ONE_ETH)).to.be.revertedWithCustomError(
        wallet,
        "NotOwner"
      );
      await expect(wallet.connect(owner).withdraw(ONE_ETH)).to.changeEtherBalance(owner, ONE_ETH);
    });
  });
});
