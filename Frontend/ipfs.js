/**
 * IPFS utility — uploads encrypted files and retrieves them.
 * Uses the public Infura IPFS API (replace with your own project ID).
 * For local dev, you can also run `ipfs daemon` and point to localhost:5001
 */

const IPFS_GATEWAY = process.env.REACT_APP_IPFS_GATEWAY || "https://ipfs.io/ipfs/";
const BACKEND_URL  = process.env.REACT_APP_BACKEND_URL  || "http://localhost:5000";

/**
 * Upload a file through our backend (which handles IPFS + AES-256 encryption)
 * @param {File} file
 * @param {string} patientAddress - used as part of encryption key derivation
 * @returns {Promise<string>} IPFS hash (CID)
 */
export async function uploadToIPFS(file, patientAddress) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("patientAddress", patientAddress);

  const response = await fetch(`${BACKEND_URL}/api/records/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "IPFS upload failed");
  }

  const data = await response.json();
  return data.ipfsHash;
}

/**
 * Get the IPFS gateway URL for a given hash
 */
export function getIPFSUrl(hash) {
  return `${IPFS_GATEWAY}${hash}`;
}

/**
 * Decrypt and download a record via backend
 */
export async function downloadRecord(ipfsHash, recordType, patientAddress) {
  const response = await fetch(
    `${BACKEND_URL}/api/records/download?hash=${ipfsHash}&patient=${patientAddress}`,
    { method: "GET" }
  );

  if (!response.ok) throw new Error("Failed to download record");

  const blob = await response.blob();
  const url  = window.URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${recordType}_${ipfsHash.slice(0, 8)}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}
