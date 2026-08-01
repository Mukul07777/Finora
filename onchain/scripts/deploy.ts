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

  console.log("\nDone. Save this address for the frontend's NEXT_PUBLIC_AGENT_WALLET_ADDRESS.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
