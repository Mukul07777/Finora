import { expect } from "chai";
import { ethers } from "hardhat";
import { CreditLine, ReputationRegistry, SettlementEscrow } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const E = (n: string) => ethers.parseEther(n);

describe("SettlementEscrow — trustless revenue capture", () => {
  let lender: HardhatEthersSigner;
  let agent: HardhatEthersSigner;
  let principal: HardhatEthersSigner;
  let customer: HardhatEthersSigner;
  let attestor: HardhatEthersSigner;
  let admin: HardhatEthersSigner;

  let reg: ReputationRegistry;
  let line: CreditLine;
  let escrow: SettlementEscrow;

  async function openLineWithDebt() {
    const RF = await ethers.getContractFactory("ReputationRegistry", admin);
    reg = await RF.deploy();
    await reg.waitForDeployment();

    const LF = await ethers.getContractFactory("CreditLine", lender);
    line = await LF.deploy(
      lender.address,
      agent.address,
      principal.address,
      await reg.getAddress(),
      E("10"),
      1200
    );
    await line.waitForDeployment();
    await reg.connect(admin).setReporter(await line.getAddress(), true);

    const required = await line.requiredBond();
    await line.connect(principal).postBond({ value: required });
    await line.connect(principal).activate();
    await line.connect(lender).fundPool({ value: E("7") });
    await line.connect(agent).drawdown(E("4"));

    const EF = await ethers.getContractFactory("SettlementEscrow", admin);
    escrow = await EF.deploy();
    await escrow.waitForDeployment();
  }

  beforeEach(async () => {
    [lender, agent, principal, customer, attestor, admin] = await ethers.getSigners();
    await openLineWithDebt();
  });

  it("customer funds a task bound to the credit line", async () => {
    const deadline = (await time.latest()) + 3600;
    await expect(
      escrow.connect(customer).fundTask(agent.address, await line.getAddress(), deadline, { value: E("5") })
    ).to.emit(escrow, "TaskFunded");
    const t = await escrow.tasks(0);
    expect(t.customer).to.equal(customer.address);
    expect(t.creditLine).to.equal(await line.getAddress());
    expect(t.amount).to.equal(E("5"));
  });

  it("release routes revenue to the line and skims the debt — agent gets only net", async () => {
    const deadline = (await time.latest()) + 3600;
    await escrow.connect(customer).fundTask(agent.address, await line.getAddress(), deadline, { value: E("5") });

    expect(await line.outstanding()).to.be.greaterThanOrEqual(E("4"));
    await expect(escrow.connect(customer).releaseByCustomer(0)).to.emit(escrow, "TaskReleased");

    // 4 ETH principal (+ tiny interest) was skimmed; debt cleared.
    expect(await line.drawn()).to.equal(0n);
    const net = await line.revenueNet();
    expect(net).to.be.greaterThan(0n);
    expect(net).to.be.lessThan(E("1")); // ~1 ETH of the 5, rest repaid
    await expect(line.connect(agent).withdrawNet()).to.changeEtherBalance(agent, net);
  });

  it("the agent cannot release the escrow to grab the gross", async () => {
    const deadline = (await time.latest()) + 3600;
    await escrow.connect(customer).fundTask(agent.address, await line.getAddress(), deadline, { value: E("5") });
    await expect(escrow.connect(agent).releaseByCustomer(0)).to.be.revertedWithCustomError(
      escrow,
      "NotCustomer"
    );
    // There is no function on the escrow that pays the agent directly — the
    // only outbound path is into the bound credit line's reportRevenue().
  });

  it("an attestor can confirm completion with an EIP-712 signature", async () => {
    const deadline = (await time.latest()) + 3600;
    await escrow.connect(customer).fundTask(agent.address, await line.getAddress(), deadline, { value: E("5") });

    const netChain = await ethers.provider.getNetwork();
    const domain = {
      name: "Finora SettlementEscrow",
      version: "1",
      chainId: Number(netChain.chainId),
      verifyingContract: await escrow.getAddress(),
    };
    const types = {
      Completion: [
        { name: "taskId", type: "uint256" },
        { name: "agent", type: "address" },
        { name: "amount", type: "uint256" },
      ],
    };
    const value = { taskId: 0, agent: agent.address, amount: E("5") };
    const sig = await attestor.signTypedData(domain, types, value);

    await expect(escrow.connect(agent).releaseWithAttestation(0, attestor.address, sig)).to.emit(
      escrow,
      "TaskReleased"
    );
    expect(await line.drawn()).to.equal(0n);
  });

  it("rejects a forged attestation", async () => {
    const deadline = (await time.latest()) + 3600;
    await escrow.connect(customer).fundTask(agent.address, await line.getAddress(), deadline, { value: E("5") });

    const netChain = await ethers.provider.getNetwork();
    const domain = {
      name: "Finora SettlementEscrow",
      version: "1",
      chainId: Number(netChain.chainId),
      verifyingContract: await escrow.getAddress(),
    };
    const types = {
      Completion: [
        { name: "taskId", type: "uint256" },
        { name: "agent", type: "address" },
        { name: "amount", type: "uint256" },
      ],
    };
    // agent signs but claims it's the attestor
    const sig = await agent.signTypedData(domain, types, { taskId: 0, agent: agent.address, amount: E("5") });
    await expect(
      escrow.connect(agent).releaseWithAttestation(0, attestor.address, sig)
    ).to.be.revertedWithCustomError(escrow, "BadAttestation");
  });

  it("refund goes to the customer after the deadline, never the agent", async () => {
    const deadline = (await time.latest()) + 100;
    await escrow.connect(customer).fundTask(agent.address, await line.getAddress(), deadline, { value: E("5") });

    await expect(escrow.connect(customer).refund(0)).to.be.revertedWithCustomError(
      escrow,
      "DeadlineNotPassed"
    );
    await time.increase(200);
    await expect(escrow.connect(agent).refund(0)).to.be.revertedWithCustomError(escrow, "NotCustomer");
    await expect(escrow.connect(customer).refund(0)).to.changeEtherBalance(customer, E("5"));
  });

  it("cannot release after the deadline, and cannot double-finalize", async () => {
    const deadline = (await time.latest()) + 100;
    await escrow.connect(customer).fundTask(agent.address, await line.getAddress(), deadline, { value: E("5") });
    await time.increase(200);
    await expect(escrow.connect(customer).releaseByCustomer(0)).to.be.revertedWithCustomError(
      escrow,
      "DeadlinePassed"
    );
  });
});
