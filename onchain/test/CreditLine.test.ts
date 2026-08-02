import { expect } from "chai";
import { ethers } from "hardhat";
import { CreditLine, ReputationRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const E = (n: string) => ethers.parseEther(n);

describe("ReputationRegistry", () => {
  let admin: HardhatEthersSigner;
  let reporter: HardhatEthersSigner;
  let agent: HardhatEthersSigner;
  let principal: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;
  let reg: ReputationRegistry;

  beforeEach(async () => {
    [admin, reporter, agent, principal, stranger] = await ethers.getSigners();
    const F = await ethers.getContractFactory("ReputationRegistry", admin);
    reg = await F.deploy();
    await reg.waitForDeployment();
    await reg.connect(admin).setReporter(reporter.address, true);
  });

  it("seeds a fresh agent at the seed score", async () => {
    expect(await reg.scoreOf(agent.address)).to.equal(700);
  });

  it("only a reporter can write scores", async () => {
    await expect(reg.connect(stranger).recordJobSuccess(agent.address, 10)).to.be.revertedWithCustomError(
      reg,
      "NotReporter"
    );
  });

  it("job success raises the score and clamps at the max", async () => {
    await reg.connect(reporter).bootstrap(agent.address, ethers.ZeroAddress);
    await reg.connect(reporter).recordJobSuccess(agent.address, 50);
    expect(await reg.scoreOf(agent.address)).to.equal(750);
    for (let i = 0; i < 10; i++) await reg.connect(reporter).recordJobSuccess(agent.address, 50);
    expect(await reg.scoreOf(agent.address)).to.equal(990); // clamped
  });

  it("rogue attempts and defaults lower the score, clamped at the floor", async () => {
    await reg.connect(reporter).bootstrap(agent.address, ethers.ZeroAddress);
    await reg.connect(reporter).recordRogueAttempt(agent.address, 100);
    expect(await reg.scoreOf(agent.address)).to.equal(600);
    await reg.connect(reporter).recordDefault(agent.address, 500);
    expect(await reg.scoreOf(agent.address)).to.equal(400); // floor
  });

  it("bond ratio falls as reputation rises", async () => {
    await reg.connect(reporter).bootstrap(agent.address, ethers.ZeroAddress); // 700
    const midRatio = await reg.bondRatioBps(agent.address);
    for (let i = 0; i < 10; i++) await reg.connect(reporter).recordJobSuccess(agent.address, 50); // -> 990
    const highRatio = await reg.bondRatioBps(agent.address);
    expect(highRatio).to.be.lessThan(midRatio);
    expect(highRatio).to.equal(500n); // 5% at max score
  });

  it("a new agent inherits its principal's standing at a discount", async () => {
    // principal builds standing through a first agent
    await reg.connect(reporter).bootstrap(agent.address, principal.address);
    for (let i = 0; i < 4; i++) await reg.connect(reporter).recordJobSuccess(agent.address, 50); // 900
    expect(await reg.principalScore(principal.address)).to.equal(900);
    // a fresh second agent under the same principal starts above the cold seed
    const secondAgent = stranger;
    const start = await reg.connect(reporter).bootstrap.staticCall(secondAgent.address, principal.address);
    expect(start).to.equal(765n); // 85% of 900
    expect(start).to.be.greaterThan(700n);
  });

  it("cannot bootstrap the same agent twice", async () => {
    await reg.connect(reporter).bootstrap(agent.address, ethers.ZeroAddress);
    await expect(reg.connect(reporter).bootstrap(agent.address, ethers.ZeroAddress)).to.be.revertedWithCustomError(
      reg,
      "AlreadyBootstrapped"
    );
  });
});

describe("CreditLine — enforced repayment, slashable bond", () => {
  let lender: HardhatEthersSigner;
  let agent: HardhatEthersSigner;
  let principal: HardhatEthersSigner;
  let payer: HardhatEthersSigner;
  let admin: HardhatEthersSigner;
  let reg: ReputationRegistry;
  let line: CreditLine;

  const BASE_LIMIT = E("10");
  const APR_BPS = 1200; // 12%

  async function deployLine() {
    const RF = await ethers.getContractFactory("ReputationRegistry", admin);
    reg = await RF.deploy();
    await reg.waitForDeployment();

    const LF = await ethers.getContractFactory("CreditLine", lender);
    line = await LF.deploy(
      lender.address,
      agent.address,
      principal.address,
      await reg.getAddress(),
      BASE_LIMIT,
      APR_BPS
    );
    await line.waitForDeployment();
    // the CreditLine must be allowed to write reputation (default/success)
    await reg.connect(admin).setReporter(await line.getAddress(), true);
  }

  beforeEach(async () => {
    [lender, agent, principal, payer, admin] = await ethers.getSigners();
    await deployLine();
  });

  it("credit limit scales with the agent's reputation", async () => {
    // seed score 700 -> 70% of base
    expect(await line.creditLimit()).to.equal(E("7"));
  });

  it("cannot activate without covering the reputation-scaled bond", async () => {
    await expect(line.connect(principal).activate()).to.be.revertedWithCustomError(line, "BondTooSmall");
  });

  it("activates once the bond meets the requirement", async () => {
    const required = await line.requiredBond();
    await line.connect(principal).postBond({ value: required });
    await expect(line.connect(principal).activate()).to.not.be.reverted;
    expect(await line.open()).to.equal(true);
  });

  it("lets the agent draw down up to the limit, and blocks over-draw", async () => {
    const required = await line.requiredBond();
    await line.connect(principal).postBond({ value: required });
    await line.connect(principal).activate();
    await line.connect(lender).fundPool({ value: E("7") });

    await expect(line.connect(agent).drawdown(E("3"))).to.changeEtherBalance(agent, E("3"));
    expect(await line.drawn()).to.equal(E("3"));
    // limit is 7; already drew 3; drawing 5 more must fail
    await expect(line.connect(agent).drawdown(E("5"))).to.be.revertedWithCustomError(line, "ExceedsLimit");
  });

  it("skims repayment from revenue before the agent can touch it", async () => {
    const required = await line.requiredBond();
    await line.connect(principal).postBond({ value: required });
    await line.connect(principal).activate();
    await line.connect(lender).fundPool({ value: E("7") });
    await line.connect(agent).drawdown(E("4"));
    expect(await line.outstanding()).to.be.greaterThanOrEqual(E("4"));

    // Task revenue of 5 ETH arrives. 4 (principal) + tiny interest is
    // skimmed; only the remainder becomes the agent's withdrawable net.
    await line.connect(payer).reportRevenue({ value: E("5") });

    expect(await line.drawn()).to.equal(0n);
    const net = await line.revenueNet();
    expect(net).to.be.greaterThan(0n);
    expect(net).to.be.lessThan(E("1")); // ~1 ETH minus the interest skim
    // agent withdraws only the net
    await expect(line.connect(agent).withdrawNet()).to.changeEtherBalance(agent, net);
  });

  it("agent cannot withdraw gross — withdrawNet only pays the post-skim balance", async () => {
    const required = await line.requiredBond();
    await line.connect(principal).postBond({ value: required });
    await line.connect(principal).activate();
    await line.connect(lender).fundPool({ value: E("7") });
    await line.connect(agent).drawdown(E("4"));
    // revenue exactly equals debt -> nothing left for the agent
    await line.connect(payer).reportRevenue({ value: E("4") });
    await expect(line.connect(agent).withdrawNet()).to.be.revertedWithCustomError(line, "NothingWithdrawable");
  });

  it("on default, the lender slashes the bond and reputation is hit on-chain", async () => {
    const required = await line.requiredBond();
    await line.connect(principal).postBond({ value: required });
    await line.connect(principal).activate();
    await line.connect(lender).fundPool({ value: E("7") });
    await line.connect(agent).drawdown(E("4"));

    const before = await reg.scoreOf(agent.address);
    await expect(line.connect(lender).declareDefault()).to.emit(line, "Defaulted");
    const after = await reg.scoreOf(agent.address);
    expect(after).to.be.lessThan(before);
    expect(await line.bond()).to.be.lessThan(required); // bond was slashed
  });

  it("a clean close refunds the bond and rewards reputation", async () => {
    const required = await line.requiredBond();
    await line.connect(principal).postBond({ value: required });
    await line.connect(principal).activate();
    await line.connect(lender).fundPool({ value: E("7") });
    await line.connect(agent).drawdown(E("2"));
    await line.connect(payer).reportRevenue({ value: E("3") }); // clears debt + interest
    expect(await line.outstanding()).to.equal(0n);

    const before = await reg.scoreOf(agent.address);
    await expect(line.connect(principal).closeAndReclaim()).to.changeEtherBalance(principal, required);
    expect(await reg.scoreOf(agent.address)).to.be.greaterThan(before);
  });

  it("only the agent can draw down; only the lender can declare default", async () => {
    const required = await line.requiredBond();
    await line.connect(principal).postBond({ value: required });
    await line.connect(principal).activate();
    await line.connect(lender).fundPool({ value: E("7") });
    await expect(line.connect(lender).drawdown(E("1"))).to.be.revertedWithCustomError(line, "NotAgent");
    await line.connect(agent).drawdown(E("1"));
    await expect(line.connect(agent).declareDefault()).to.be.revertedWithCustomError(line, "NotLender");
  });
});
