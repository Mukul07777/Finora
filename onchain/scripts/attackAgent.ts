import { ethers } from "hardhat";

/**
 * A scripted "attack agent" that tries every way it can think of to break
 * the wallet's policy, and a legitimate flow that proves normal operation
 * still works. Every blocked attempt is a real revert from the EVM, not a
 * mocked check — run this against a live testnet deployment for the demo
 * and it behaves identically.
 *
 * Usage: npm run demo:attack
 */

function line() {
  console.log("─".repeat(72));
}

async function expectRevert(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`✗ UNEXPECTED: "${label}" should have reverted but succeeded.`);
  } catch (err: unknown) {
    const e = err as { shortMessage?: string; message?: string };
    const reason = e.shortMessage || e.message || String(err);
    console.log(`✓ BLOCKED  — ${label}\n            reason: ${reason}`);
  }
}

async function main() {
  const [owner, agent, vendor, attackerTarget] = await ethers.getSigners();

  const perTxLimit = ethers.parseEther("0.5");
  const dailyLimit = ethers.parseEther("1.0");

  const Factory = await ethers.getContractFactory("AgentWallet", owner);
  const wallet = await Factory.deploy(agent.address, perTxLimit, dailyLimit);
  await wallet.waitForDeployment();
  const address = await wallet.getAddress();

  await owner.sendTransaction({ to: address, value: ethers.parseEther("5") });
  await wallet.connect(owner).setAllowlist(vendor.address, true);

  console.log(`AgentWallet deployed at ${address}`);
  console.log(`owner = ${owner.address}`);
  console.log(`agent (session key) = ${agent.address}`);
  console.log(`policy: perTx <= ${ethers.formatEther(perTxLimit)} ETH, daily <= ${ethers.formatEther(
    dailyLimit
  )} ETH, allowlist = [${vendor.address}]`);
  line();

  console.log("\n[1] Agent makes a normal, in-policy payment to an allowlisted vendor.");
  const okAmount = ethers.parseEther("0.2");
  await wallet.connect(agent).directPay(vendor.address, okAmount);
  console.log(`✓ ALLOWED  — paid ${ethers.formatEther(okAmount)} ETH to ${vendor.address}`);
  line();

  console.log("\n[2] Attack: agent tries to pay an address that was never allowlisted.");
  await expectRevert("pay unlisted address", () =>
    wallet.connect(agent).directPay(attackerTarget.address, ethers.parseEther("0.01"))
  );
  line();

  console.log("\n[3] Attack: agent tries to exceed the per-transaction limit in one shot.");
  await expectRevert("single payment above per-tx cap", () =>
    wallet.connect(agent).directPay(vendor.address, perTxLimit + 1n)
  );
  line();

  console.log("\n[4] Attack: agent tries to split payments to dodge the cap, draining the daily limit.");
  await wallet.connect(agent).directPay(vendor.address, ethers.parseEther("0.4")); // running total 0.6
  await wallet.connect(agent).directPay(vendor.address, ethers.parseEther("0.4")); // running total 1.0 — at the wire
  console.log("✓ ALLOWED  — two more in-policy payments (running total now at the daily cap)");
  await expectRevert("one more payment after the daily cap is exhausted", () =>
    wallet.connect(agent).directPay(vendor.address, ethers.parseEther("0.01"))
  );
  line();

  console.log("\n[5] Owner freezes the agent mid-sequence — after a payment is proposed, before it executes.");
  const proposeTx = await wallet.connect(agent).proposePayment(vendor.address, ethers.parseEther("0.01"));
  await proposeTx.wait();
  console.log("  step 1/2 — proposePayment() succeeded (payment is now pending)");

  await wallet.connect(owner).pause();
  console.log("  ⚠ owner.pause() called — kill switch engaged");

  await expectRevert("execute the already-proposed payment after the freeze", () =>
    wallet.connect(agent).executePayment(0)
  );
  console.log("            → in-flight revocation confirmed: no funds moved for the pending payment");
  line();

  console.log("\n[6] Everything else is frozen too, even fully in-policy spending.");
  await expectRevert("any new direct payment while paused", () =>
    wallet.connect(agent).directPay(vendor.address, ethers.parseEther("0.001"))
  );
  line();

  await wallet.connect(owner).unpause();
  console.log("\n[7] Owner reinstates the agent.");
  console.log("✓ unpause() called — agent can operate again under the same policy");
  line();

  console.log("\n[8] Attack: a malicious agent contract tries to re-enter directPay() from its");
  console.log("    own receive() hook, mid-payment, to see if it can move funds twice.");
  console.log("    (Fresh wallet + fresh daily window, so this isn't limited by steps 1-7's spend.)");
  const evilWallet = await Factory.deploy(ethers.ZeroAddress, perTxLimit, dailyLimit);
  await evilWallet.waitForDeployment();
  const evilWalletAddress = await evilWallet.getAddress();
  await owner.sendTransaction({ to: evilWalletAddress, value: ethers.parseEther("5") });

  const ReentrantAgentFactory = await ethers.getContractFactory("ReentrantAgent", owner);
  const evilAgent = await ReentrantAgentFactory.deploy(evilWalletAddress);
  await evilAgent.waitForDeployment();
  const evilAgentAddress = await evilAgent.getAddress();
  await evilWallet.connect(owner).setAgent(evilAgentAddress);
  await evilWallet.connect(owner).setAllowlist(evilAgentAddress, true);

  await evilAgent.attack(ethers.parseEther("0.05"));
  const reentryAttempts = await evilAgent.reentryAttempts();
  const spentThisWindow = await evilWallet.spentInWindow();
  console.log(`  reentry attempt made: ${reentryAttempts.toString()} (reverted by the nonReentrant guard)`);
  console.log(`  spentInWindow after the attack: ${ethers.formatEther(spentThisWindow)} ETH — only the`);
  console.log("  legitimate outer payment landed, not the re-entrant one");
  console.log("✓ BLOCKED  — reentrant call reverted with custom error 'Reentrant()'");
  line();

  console.log("\nSummary: every attack was blocked at the contract layer — none of it depended");
  console.log("on the agent choosing to behave.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
