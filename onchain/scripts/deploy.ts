import { ethers, network } from "hardhat";

/**
 * Deploys AgentWallet and (optionally) seeds it with a starting policy,
 * an allowlisted vendor, and a small ETH deposit so it's demo-ready
 * immediately after deployment.
 *
 * Usage:
 *   npm run deploy:local          # local Hardhat network, uses default signers
 *   npm run deploy:baseSepolia    # needs DEPLOYER_PRIVATE_KEY in .env + testnet ETH
 */
async function main() {
  const [deployer, fallbackAgent, fallbackVendor] = await ethers.getSigners();

  const agentAddress = process.env.AGENT_ADDRESS || fallbackAgent?.address;
  if (!agentAddress) {
    throw new Error("No agent address available — set AGENT_ADDRESS in .env for live networks.");
  }

  const perTxLimit = ethers.parseEther("0.05");
  const dailyLimit = ethers.parseEther("0.2");

  console.log(`Deploying AgentWallet to network: ${network.name}`);
  console.log(`  owner  = ${deployer.address}`);
  console.log(`  agent  = ${agentAddress}`);
  console.log(`  perTx  = ${ethers.formatEther(perTxLimit)} ETH`);
  console.log(`  daily  = ${ethers.formatEther(dailyLimit)} ETH`);

  const Factory = await ethers.getContractFactory("AgentWallet", deployer);
  const wallet = await Factory.deploy(agentAddress, perTxLimit, dailyLimit);
  await wallet.waitForDeployment();
  const address = await wallet.getAddress();

  console.log(`\nAgentWallet deployed at: ${address}`);

  if (fallbackVendor) {
    const tx = await wallet.connect(deployer).setAllowlist(fallbackVendor.address, true);
    await tx.wait();
    console.log(`Allowlisted demo vendor: ${fallbackVendor.address}`);
  }

  if (network.name === "hardhat" || network.name === "localhost") {
    const fundTx = await deployer.sendTransaction({ to: address, value: ethers.parseEther("1") });
    await fundTx.wait();
    console.log(`Funded wallet with 1 ETH for local testing.`);
  }

  console.log("\nAgentWallet ready.");

  // --- Reputation + Credit stack -----------------------------------------
  console.log("\nDeploying ReputationRegistry + CreditLine...");
  const RegFactory = await ethers.getContractFactory("ReputationRegistry", deployer);
  const registry = await RegFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`ReputationRegistry deployed at: ${registryAddress}`);

  const principalAddress = process.env.PRINCIPAL_ADDRESS || deployer.address;
  const lenderAddress = deployer.address; // the deployer funds the pool in this demo
  const baseLimit = ethers.parseEther("10");
  const aprBps = 1200;

  const LineFactory = await ethers.getContractFactory("CreditLine", deployer);
  const creditLine = await LineFactory.deploy(
    lenderAddress,
    agentAddress,
    principalAddress,
    registryAddress,
    baseLimit,
    aprBps
  );
  await creditLine.waitForDeployment();
  const creditLineAddress = await creditLine.getAddress();
  console.log(`CreditLine deployed at: ${creditLineAddress}`);

  // Let the credit line write reputation (job success / default).
  const repTx = await registry.connect(deployer).setReporter(creditLineAddress, true);
  await repTx.wait();
  console.log("CreditLine authorized as a reputation reporter.");

  if (network.name === "hardhat" || network.name === "localhost") {
    const fund = await deployer.sendTransaction({ to: creditLineAddress, value: ethers.parseEther("1") });
    await fund.wait();
    console.log("Seeded CreditLine with 1 ETH for local testing.");
  }

  // Settlement escrow — the trustless revenue-capture layer.
  const EscrowFactory = await ethers.getContractFactory("SettlementEscrow", deployer);
  const escrow = await EscrowFactory.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`SettlementEscrow deployed at: ${escrowAddress}`);

  console.log("\nDone. Frontend env:");
  console.log(`  NEXT_PUBLIC_AGENT_WALLET_ADDRESS=${address}`);
  console.log(`  NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`  NEXT_PUBLIC_CREDIT_LINE_ADDRESS=${creditLineAddress}`);
  console.log(`  NEXT_PUBLIC_SETTLEMENT_ESCROW_ADDRESS=${escrowAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
