const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, doctor1, patient1] = await ethers.getSigners();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Blockchain E-Health Record System — Deployment");
  console.log("  IILM University Major Project 2025-26");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`\nDeployer : ${deployer.address}`);
  console.log(`Balance  : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // Deploy
  console.log("Deploying EHRSystem contract...");
  const EHRSystem = await ethers.getContractFactory("EHRSystem");
  const ehr = await EHRSystem.deploy();
  await ehr.waitForDeployment();

  const contractAddress = await ehr.getAddress();
  console.log(`✅ EHRSystem deployed at: ${contractAddress}\n`);

  // Seed demo data (only on localhost)
  if (hre.network.name === "localhost") {
    console.log("Seeding demo data...");

    // Register a demo doctor
    await ehr.connect(deployer).registerDoctor(
      doctor1.address,
      "Dr. Arjun Sharma",
      "AIIMS New Delhi"
    );
    console.log(`  ✅ Doctor registered: ${doctor1.address}`);

    // Register a demo patient
    await ehr.connect(patient1).registerPatient("Priya Mehta");
    console.log(`  ✅ Patient registered: ${patient1.address}`);

    // Patient grants access to doctor (30 days)
    await ehr.connect(patient1).grantAccess(doctor1.address, 30 * 24 * 60 * 60);
    console.log(`  ✅ Access granted from patient to doctor`);

    // Doctor uploads a record for patient
    await ehr.connect(doctor1).uploadRecord(
      patient1.address,
      "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      "Lab Report",
      "Complete Blood Count — March 2026"
    );
    console.log(`  ✅ Demo record uploaded\n`);
  }

  // Save deployment info for frontend/backend
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  // Write to frontend abi folder
  const frontendAbiDir = path.join(__dirname, "../frontend/src/abi");
  if (!fs.existsSync(frontendAbiDir)) fs.mkdirSync(frontendAbiDir, { recursive: true });

  // Copy ABI
  const artifactPath = path.join(
    __dirname, "../artifacts/contracts/EHRSystem.sol/EHRSystem.json"
  );
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(
      path.join(frontendAbiDir, "EHRSystem.json"),
      JSON.stringify({ abi: artifact.abi, address: contractAddress }, null, 2)
    );
    console.log("✅ ABI + address written to frontend/src/abi/EHRSystem.json");
  }

  // Write deployment summary
  fs.writeFileSync(
    path.join(__dirname, "../deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Deployment complete!");
  console.log(`  Contract: ${contractAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
