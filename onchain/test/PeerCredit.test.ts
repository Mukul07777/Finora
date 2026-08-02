import { expect } from "chai";
import { ethers } from "hardhat";
import { CreditLine, ReputationRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const E = (n: string) => ethers.parseEther(n);

describe("Agent-to-agent peer-backed credit", () => {
  let admin: HardhatEthersSigner;
  let principal: HardhatEthersSigner;
  let agentA: HardhatEthersSigner;
  let agentB: HardhatEthersSigner;
  let cold: HardhatEthersSigner;
  let lender: HardhatEthersSigner;
  let reg: ReputationRegistry;

  beforeEach(async () => {
    [admin, principal, agentA, agentB, cold, lender] = await ethers.getSigners();
    const RF = await ethers.getContractFactory("ReputationRegistry", admin);
    reg = await RF.deploy();
    await reg.waitForDeployment();
    // agent A builds a track record under `principal`
    await reg.bootstrap(agentA.address, principal.address);
    for (let i = 0; i < 5; i++) await reg.recordJobSuccess(agentA.address, 45);
  });

  it("a peer-backed new agent gets a better score than a cold one", async () => {
    await reg.bootstrap(agentB.address, principal.address);
    await reg.bootstrap(cold.address, ethers.ZeroAddress);
    expect(await reg.scoreOf(agentB.address)).to.be.greaterThan(await reg.scoreOf(cold.address));
  });

  it("peer-backing yields a higher limit and a smaller required bond on a real line", async () => {
    await reg.bootstrap(agentB.address, principal.address);
    await reg.bootstrap(cold.address, ethers.ZeroAddress);

    const Line = await ethers.getContractFactory("CreditLine", lender);
    const base = E("10");
    const lineB = await Line.deploy(
      lender.address, agentB.address, principal.address, await reg.getAddress(), base, 1200
    );
    await lineB.waitForDeployment();
    const lineC = await Line.deploy(
      lender.address, cold.address, cold.address, await reg.getAddress(), base, 1200
    );
    await lineC.waitForDeployment();

    expect(await lineB.creditLimit()).to.be.greaterThan(await lineC.creditLimit());
    expect(await lineB.requiredBond()).to.be.lessThan(await lineC.requiredBond());
  });
});
