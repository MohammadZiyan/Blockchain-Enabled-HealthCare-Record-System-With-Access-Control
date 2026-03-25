# ⛓ EHRChain — Blockchain-Enabled E-Health Record Sharing System

> **IILM University | School of Computer Science & Engineering | Major Project 2025-26**
> Blockchain-based EHR system with Role-Based Access Control, AES-256 encryption, and IPFS storage.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                               │
│   React.js Frontend  ←→  MetaMask Wallet  ←→  Ethers.js            │
└───────────────────┬────────────────────────────────────────────────-┘
                    │ HTTPS                          │ JSON-RPC
                    ▼                                ▼
┌───────────────────────────┐       ┌────────────────────────────────┐
│   Node.js Backend         │       │   Ethereum Blockchain          │
│   Express + Multer        │       │   (Hardhat local / Sepolia)    │
│   AES-256 Encryption      │       │                                │
│   IPFS Upload/Download    │       │   EHRSystem.sol                │
└────────────┬──────────────┘       │   ├─ User Registry (RBAC)     │
             │ Encrypted file        │   ├─ Medical Record Registry  │
             ▼                       │   ├─ Access Control           │
┌────────────────────────┐          │   └─ Immutable Audit Log       │
│   IPFS Network         │          └────────────────────────────────┘
│   (Pinata / Local)     │
│   Stores ONLY          │
│   encrypted ciphertext │
└────────────────────────┘
```

**Data flow:**
1. Patient uploads a file → Backend encrypts with AES-256 → Stores on IPFS → Returns IPFS hash
2. Hash stored on-chain via `uploadRecord()` smart contract call
3. Doctor requests access → Patient grants via `grantAccess()` → Stored on-chain
4. Doctor fetches IPFS hash from chain → Backend decrypts → Doctor downloads file
5. Every action logged immutably in `AuditLog` on-chain

---

## 🗂 Project Structure

```
ehr-blockchain/
├── contracts/
│   └── EHRSystem.sol          ← Main smart contract (RBAC + EHR + Audit)
├── scripts/
│   └── deploy.js              ← Hardhat deployment script
├── test/
│   └── EHRSystem.test.js      ← Comprehensive contract tests
├── frontend/
│   ├── public/index.html
│   └── src/
│       ├── abi/               ← Auto-generated after deploy
│       │   └── EHRSystem.json
│       ├── context/
│       │   └── Web3Context.jsx  ← Blockchain connection & user state
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── UI.jsx           ← Reusable components
│       ├── pages/
│       │   ├── LandingPage.jsx  ← Connect wallet
│       │   ├── RegisterPage.jsx ← Patient self-registration
│       │   ├── DashboardPage.jsx
│       │   ├── RecordsPage.jsx  ← Upload & view records
│       │   ├── AccessPage.jsx   ← Grant/revoke access
│       │   ├── AuditPage.jsx    ← Blockchain audit trail
│       │   └── AdminPage.jsx    ← Register doctors/hospitals
│       ├── utils/
│       │   └── ipfs.js          ← IPFS upload/download helpers
│       ├── App.jsx              ← Router + provider
│       └── index.js
├── backend/
│   ├── server.js              ← Express server
│   ├── routes/
│   │   └── records.js         ← Upload/download with AES-256 + IPFS
│   └── .env.example
├── hardhat.config.js
├── package.json
├── .env.example
└── README.md
```

---

## ⚙️ Prerequisites

Install these before starting:

| Tool         | Version   | Download |
|--------------|-----------|----------|
| Node.js      | ≥ 18.x    | https://nodejs.org |
| npm          | ≥ 9.x     | (comes with Node) |
| MetaMask     | Latest    | https://metamask.io |
| Git          | Any       | https://git-scm.com |

---

## 🚀 Setup — Step by Step

### Step 1 — Clone and install root dependencies

```bash
git clone <your-repo-url>
cd ehr-blockchain

npm install
```

### Step 2 — Compile the smart contract

```bash
npx hardhat compile
```

You should see: `Compiled 1 Solidity file successfully`

### Step 3 — Run tests

```bash
npx hardhat test
```

Expected output:
```
  EHRSystem
    Registration
      ✔ Should register a patient
      ✔ Should register a doctor (admin only)
      ✔ Should prevent double-registration
      ✔ Should prevent non-admin from registering doctors
    Access Control
      ✔ Should allow patient to grant access
      ✔ Should allow patient to revoke access
      ✔ Should deny access by default
      ✔ Should handle access expiry
    Medical Records
      ✔ Should allow patient to upload own record
      ✔ Should allow doctor to upload record for consented patient
      ✔ Should deny doctor access without patient consent
      ✔ Should deny strangers from viewing records
      ✔ Should emit RecordUploaded event
    Audit Log
      ✔ Should log registration events
      ✔ Should log access grants and revocations

  15 passing
```

### Step 4 — Start a local Hardhat blockchain

Open a **new terminal** and run:

```bash
npx hardhat node
```

This starts a local Ethereum node at `http://127.0.0.1:8545` with 20 pre-funded test accounts.
**Copy the first few private keys** — you'll need them for MetaMask.

### Step 5 — Deploy the contract

In your **original terminal**:

```bash
npm run deploy:local
```

This will:
- Deploy `EHRSystem.sol` to your local Hardhat node
- Seed demo data (one doctor, one patient, one record)
- Automatically write `frontend/src/abi/EHRSystem.json` with the contract address + ABI

### Step 6 — Set up MetaMask for local development

1. Open MetaMask → click network dropdown → **Add network manually**
2. Fill in:
   - **Network Name:** Hardhat Local
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
3. Import test accounts using private keys printed by `npx hardhat node`
   - Account 0 → Admin (deployer)
   - Account 1 → Doctor (Dr. Arjun Sharma)
   - Account 2 → Patient (Priya Mehta)

### Step 7 — Start the backend

```bash
cd backend
npm install
cp .env.example .env     # edit .env if you have Pinata keys
npm start
```

Backend runs at `http://localhost:5000`

> **Note on IPFS:** Without Pinata keys, the backend tries to connect to a local IPFS daemon.
> To run one: install IPFS Desktop (https://docs.ipfs.tech/install/) and click Start.
> Alternatively, add free Pinata keys to `backend/.env` (pinata.cloud).

### Step 8 — Start the frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`

---

## 🎮 Using the App

### As Admin (Account 0)
1. Connect MetaMask (Account 0)
2. You're auto-registered as Admin
3. Go to **Admin Panel** → Register doctors and hospitals
4. Input a doctor's wallet address, name, and hospital

### As Patient (Account 2)
1. Connect MetaMask (Account 2)
2. Click **Register as Patient** → enter your name
3. Go to **Access Control** → Grant access to a doctor's address
4. Go to **Records** → Upload a medical file (PDF/image)
5. Go to **Audit Log** → See every on-chain event

### As Doctor (Account 1)
1. Connect MetaMask (Account 1) — already registered by deploy seed
2. Go to **Records** → Enter patient's address → Click Load Records
3. View all records for patients who have granted you access

---

## 🌐 Deploying to Sepolia Testnet

1. Get free Sepolia ETH from https://faucet.sepolia.dev
2. Create `.env` in project root:
   ```
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_ID
   PRIVATE_KEY=0xYOUR_PRIVATE_KEY
   ```
3. Deploy:
   ```bash
   npm run deploy:testnet
   ```
4. Update `frontend/src/abi/EHRSystem.json` with the new address (done automatically by deploy script)

---

## 🔐 Security Model

| Threat | Mitigation |
|--------|-----------|
| Unauthorized record access | Smart contract RBAC — access denied at contract level |
| Data tampering | Records stored as IPFS hashes on immutable blockchain |
| File interception | AES-256-CBC encryption before leaving client server |
| Replay attacks | Ethereum nonce + block timestamp validation |
| Reentrancy | State updated before external calls; no ETH transfers |
| Unauthorized doctor registration | Only Admin role can register doctors |
| Sybil attacks | Wallet-based identity; one registration per address |

---

## 📋 Smart Contract Functions

### User Management
| Function | Role | Description |
|----------|------|-------------|
| `registerPatient(name)` | Anyone | Self-register as patient |
| `registerDoctor(addr, name, institution)` | Admin | Register a doctor |
| `registerHospital(addr, name)` | Admin | Register a hospital |

### Record Management
| Function | Role | Description |
|----------|------|-------------|
| `uploadRecord(patient, ipfsHash, type, desc)` | Patient/Doctor | Upload a record |
| `getPatientRecordIds(patient)` | Patient/Authorized | List record IDs |
| `getRecord(patient, recordId)` | Patient/Authorized | Fetch record + log access |

### Access Control
| Function | Role | Description |
|----------|------|-------------|
| `grantAccess(grantee, duration)` | Patient | Grant timed or permanent access |
| `revokeAccess(grantee)` | Patient | Immediately revoke access |
| `checkAccess(patient, accessor)` | Anyone | Check current access status |

### Audit
| Function | Role | Description |
|----------|------|-------------|
| `getAuditCount()` | Anyone | Total audit entries |
| `getAuditEntry(id)` | Patient/Admin | Fetch specific entry |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Ethereum (Solidity 0.8.19) |
| Development | Hardhat + Hardhat Toolbox |
| Testing | Chai + Mocha (via Hardhat) |
| Frontend | React 18 + React Router v6 |
| Blockchain SDK | Ethers.js v6 |
| Wallet | MetaMask |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| File Handling | Multer (in-memory) |
| Encryption | AES-256-CBC (Node.js crypto) |
| Decentralized Storage | IPFS via Pinata or local daemon |
| Notifications | react-hot-toast |

---

## 👥 Team

| Name | Enrollment No. | Role |
|------|---------------|------|
| [Student 1] | [XXXX] | Smart Contract + Backend |
| [Student 2] | [XXXX] | Frontend + Integration |
| [Student 3] | [XXXX] | Testing + Documentation |

**Guide:** [Guide Name] | [Designation]
**Institution:** IILM University, Greater Noida

---

## 📄 License

This project is developed for academic purposes at IILM University.
