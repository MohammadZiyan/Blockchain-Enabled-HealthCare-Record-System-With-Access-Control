const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EHRSystem", function () {
  let ehr, owner, admin, doctor, patient, stranger;

  beforeEach(async function () {
    [owner, doctor, patient, stranger] = await ethers.getSigners();
    const EHRSystem = await ethers.getContractFactory("EHRSystem");
    ehr = await EHRSystem.deploy();
    await ehr.waitForDeployment();

    // Register doctor (owner is admin)
    await ehr.connect(owner).registerDoctor(doctor.address, "Dr. Smith", "City Hospital");

    // Register patient
    await ehr.connect(patient).registerPatient("Alice");
  });

  // ─── Registration ───────────────────────────────────────────────────────────
  describe("Registration", function () {
    it("Should register a patient", async function () {
      const user = await ehr.users(patient.address);
      expect(user.name).to.equal("Alice");
      expect(user.role).to.equal(2); // Role.Patient
      expect(user.isActive).to.be.true;
    });

    it("Should register a doctor (admin only)", async function () {
      const user = await ehr.users(doctor.address);
      expect(user.name).to.equal("Dr. Smith");
      expect(user.role).to.equal(1); // Role.Doctor
    });

    it("Should prevent double-registration", async function () {
      await expect(
        ehr.connect(patient).registerPatient("Alice Again")
      ).to.be.revertedWith("EHR: Already registered");
    });

    it("Should prevent non-admin from registering doctors", async function () {
      await expect(
        ehr.connect(patient).registerDoctor(stranger.address, "Fake Doc", "Fake Hospital")
      ).to.be.revertedWith("EHR: Insufficient role");
    });
  });

  // ─── Access Control ─────────────────────────────────────────────────────────
  describe("Access Control", function () {
    it("Should allow patient to grant access", async function () {
      await ehr.connect(patient).grantAccess(doctor.address, 0);
      expect(await ehr.checkAccess(patient.address, doctor.address)).to.be.true;
    });

    it("Should allow patient to revoke access", async function () {
      await ehr.connect(patient).grantAccess(doctor.address, 0);
      await ehr.connect(patient).revokeAccess(doctor.address);
      expect(await ehr.checkAccess(patient.address, doctor.address)).to.be.false;
    });

    it("Should deny access by default", async function () {
      expect(await ehr.checkAccess(patient.address, doctor.address)).to.be.false;
    });

    it("Should handle access expiry", async function () {
      // Grant 1-second access
      await ehr.connect(patient).grantAccess(doctor.address, 1);
      expect(await ehr.checkAccess(patient.address, doctor.address)).to.be.true;

      // Advance time by 2 seconds
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine");

      expect(await ehr.checkAccess(patient.address, doctor.address)).to.be.false;
    });
  });

  // ─── Records ────────────────────────────────────────────────────────────────
  describe("Medical Records", function () {
    const IPFS_HASH = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

    beforeEach(async function () {
      await ehr.connect(patient).grantAccess(doctor.address, 0);
    });

    it("Should allow patient to upload own record", async function () {
      const tx = await ehr.connect(patient).uploadRecord(
        patient.address, IPFS_HASH, "Lab Report", "Blood test"
      );
      const receipt = await tx.wait();
      const ids = await ehr.connect(patient).getPatientRecordIds(patient.address);
      expect(ids.length).to.equal(1);
    });

    it("Should allow doctor to upload record for consented patient", async function () {
      await ehr.connect(doctor).uploadRecord(
        patient.address, IPFS_HASH, "Prescription", "Amoxicillin 500mg"
      );
      const ids = await ehr.connect(patient).getPatientRecordIds(patient.address);
      expect(ids.length).to.equal(1);
    });

    it("Should deny doctor access without patient consent", async function () {
      await ehr.connect(patient).revokeAccess(doctor.address);
      // Re-setup: doctor without access
      await expect(
        ehr.connect(doctor).uploadRecord(patient.address, IPFS_HASH, "Prescription", "Test")
      ).to.be.revertedWith("EHR: No access to this patient");
    });

    it("Should deny strangers from viewing records", async function () {
      await ehr.connect(patient).uploadRecord(
        patient.address, IPFS_HASH, "Lab Report", "Blood test"
      );
      // stranger is not registered — should fail
      await expect(
        ehr.connect(stranger).getPatientRecordIds(patient.address)
      ).to.be.revertedWith("EHR: Not registered");
    });

    it("Should emit RecordUploaded event", async function () {
      await expect(
        ehr.connect(patient).uploadRecord(patient.address, IPFS_HASH, "Scan", "MRI Brain")
      ).to.emit(ehr, "RecordUploaded");
    });
  });

  // ─── Audit Log ──────────────────────────────────────────────────────────────
  describe("Audit Log", function () {
    it("Should log registration events", async function () {
      // Constructor logs DEPLOY (audit 1), registerDoctor logs 2, registerPatient logs 3
      const count = await ehr.getAuditCount();
      expect(count).to.be.gte(3n);
    });

    it("Should log access grants and revocations", async function () {
      const before = await ehr.getAuditCount();
      await ehr.connect(patient).grantAccess(doctor.address, 0);
      await ehr.connect(patient).revokeAccess(doctor.address);
      const after = await ehr.getAuditCount();
      expect(after - before).to.equal(2n);
    });
  });
});
