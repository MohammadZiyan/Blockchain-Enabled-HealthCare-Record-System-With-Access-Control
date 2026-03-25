/**
 * records.js — API routes for medical record upload/download
 *
 * Flow:
 *   Upload:   Client file → AES-256 encrypt (key derived from patientAddress) → IPFS → return CID
 *   Download: IPFS CID → fetch ciphertext → AES-256 decrypt → stream to client
 *
 * IPFS provider: Pinata (free tier) or local IPFS daemon.
 * Set PINATA_API_KEY and PINATA_SECRET in .env for production.
 * For dev: run `ipfs daemon` locally (uses localhost:5001).
 */

const express   = require("express");
const multer    = require("multer");
const crypto    = require("crypto");
const axios     = require("axios");
const FormData  = require("form-data");
const router    = express.Router();

// In-memory storage so we don't write temp files to disk unencrypted
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Encryption helpers ───────────────────────────────────────────────────────

const MASTER_SECRET = process.env.ENCRYPTION_MASTER_SECRET || "ehr_iilm_secret_change_in_production";

/**
 * Derive a deterministic 32-byte AES key from patientAddress + master secret.
 * In production, use proper key management (HSM, AWS KMS, etc.)
 */
function deriveKey(patientAddress) {
  return crypto
    .createHmac("sha256", MASTER_SECRET)
    .update(patientAddress.toLowerCase())
    .digest(); // 32 bytes
}

function encrypt(buffer, patientAddress) {
  const key = deriveKey(patientAddress);
  const iv  = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  // Prepend IV (16 bytes) to ciphertext so we can decrypt later
  return Buffer.concat([iv, encrypted]);
}

function decrypt(buffer, patientAddress) {
  const key = deriveKey(patientAddress);
  const iv  = buffer.slice(0, 16);
  const ciphertext = buffer.slice(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ─── IPFS helpers ─────────────────────────────────────────────────────────────

async function uploadToIPFS(encryptedBuffer, originalName) {
  const PINATA_KEY    = process.env.PINATA_API_KEY;
  const PINATA_SECRET = process.env.PINATA_SECRET;

  if (PINATA_KEY && PINATA_SECRET) {
    // Production: Pinata
    const formData = new FormData();
    formData.append("file", encryptedBuffer, {
      filename: originalName + ".enc",
      contentType: "application/octet-stream",
    });
    formData.append("pinataMetadata", JSON.stringify({ name: originalName }));

    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key:        PINATA_KEY,
          pinata_secret_api_key: PINATA_SECRET,
        },
        maxBodyLength: Infinity,
      }
    );
    return res.data.IpfsHash;

  } else {
    // Development: local IPFS daemon (run `ipfs daemon`)
    const formData = new FormData();
    formData.append("file", encryptedBuffer, {
      filename: originalName + ".enc",
      contentType: "application/octet-stream",
    });
    const res = await axios.post(
      "http://localhost:5001/api/v0/add",
      formData,
      { headers: formData.getHeaders(), params: { pin: true } }
    );
    return res.data.Hash;
  }
}

async function fetchFromIPFS(ipfsHash) {
  const gateway = process.env.IPFS_GATEWAY || "https://ipfs.io/ipfs/";
  const res = await axios.get(`${gateway}${ipfsHash}`, {
    responseType: "arraybuffer",
    timeout: 30000,
  });
  return Buffer.from(res.data);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/records/upload
 * Body (multipart): file, patientAddress
 * Returns: { ipfsHash }
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { patientAddress } = req.body;
    const file = req.file;

    if (!file)           return res.status(400).json({ message: "No file provided" });
    if (!patientAddress) return res.status(400).json({ message: "patientAddress required" });
    if (!patientAddress.startsWith("0x"))
      return res.status(400).json({ message: "Invalid patientAddress" });

    // 1. Encrypt
    const encrypted = encrypt(file.buffer, patientAddress);

    // 2. Upload to IPFS
    const ipfsHash = await uploadToIPFS(encrypted, file.originalname);

    console.log(`[UPLOAD] Patient: ${patientAddress.slice(0,8)}… | File: ${file.originalname} | IPFS: ${ipfsHash}`);

    res.json({ ipfsHash, fileName: file.originalname, size: file.size });

  } catch (err) {
    console.error("[UPLOAD ERROR]", err.message);
    res.status(500).json({ message: err.message || "Upload failed" });
  }
});

/**
 * GET /api/records/download?hash=<ipfsHash>&patient=<address>
 * Returns decrypted file as octet-stream
 */
router.get("/download", async (req, res) => {
  try {
    const { hash, patient } = req.query;
    if (!hash || !patient)
      return res.status(400).json({ message: "hash and patient required" });

    // 1. Fetch encrypted file from IPFS
    const encrypted = await fetchFromIPFS(hash);

    // 2. Decrypt
    const decrypted = decrypt(encrypted, patient);

    console.log(`[DOWNLOAD] Patient: ${patient.slice(0,8)}… | IPFS: ${hash}`);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${hash.slice(0,10)}.pdf"`);
    res.send(decrypted);

  } catch (err) {
    console.error("[DOWNLOAD ERROR]", err.message);
    res.status(500).json({ message: err.message || "Download failed" });
  }
});

module.exports = router;
