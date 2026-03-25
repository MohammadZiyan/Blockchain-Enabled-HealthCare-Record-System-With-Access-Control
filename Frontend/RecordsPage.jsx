import React, { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { Card, Button, Input, Select, SectionHeader, EmptyState, Spinner, AddressChip } from "../components/UI";
import { uploadToIPFS } from "../utils/ipfs";
import toast from "react-hot-toast";

const RECORD_TYPES = [
  { value: "Lab Report",    label: "🧪 Lab Report"    },
  { value: "Prescription",  label: "💊 Prescription"  },
  { value: "Scan",          label: "🔬 Diagnostic Scan" },
  { value: "Discharge",     label: "🏥 Discharge Summary" },
  { value: "Vaccination",   label: "💉 Vaccination Record" },
  { value: "Other",         label: "📄 Other"          },
];

export default function RecordsPage() {
  const { contract, account, userProfile } = useWeb3();
  const [records,        setRecords]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showUpload,     setShowUpload]      = useState(false);

  // Upload form state
  const [patientAddr,    setPatientAddr]    = useState("");
  const [recordType,     setRecordType]     = useState("Lab Report");
  const [description,    setDescription]   = useState("");
  const [file,           setFile]           = useState(null);
  const [uploading,      setUploading]      = useState(false);

  const isPatient = userProfile?.role === "Patient";
  const isDoctor  = userProfile?.role === "Doctor" || userProfile?.role === "Hospital";

  useEffect(() => {
    if (isPatient) loadPatientRecords(account);
  }, [contract, account, isPatient]);

  async function loadPatientRecords(addr) {
    setLoading(true);
    try {
      const ids = await contract.getPatientRecordIds(addr);
      const loaded = await Promise.all(
        ids.map(async (id) => {
          try {
            // Use static call to avoid writing audit entry just to view list
            const rec = await contract.records(id);
            return {
              id:          Number(rec.id),
              ipfsHash:    rec.ipfsHash,
              recordType:  rec.recordType,
              description: rec.description,
              uploadedBy:  rec.uploadedBy,
              timestamp:   Number(rec.timestamp),
              isActive:    rec.isActive,
            };
          } catch { return null; }
        })
      );
      setRecords(loaded.filter(Boolean).filter(r => r.isActive));
    } catch (e) {
      toast.error("Failed to load records: " + (e.reason || e.message));
    } finally {
      setLoading(false);
    }
  }

  async function loadDoctorPatientRecords() {
    if (!patientAddr || !patientAddr.startsWith("0x")) {
      return toast.error("Enter a valid patient address");
    }
    setLoading(true);
    try {
      const ids = await contract.getPatientRecordIds(patientAddr);
      const loaded = await Promise.all(
        ids.map(async (id) => {
          const rec = await contract.records(id);
          return { id: Number(rec.id), ipfsHash: rec.ipfsHash, recordType: rec.recordType,
            description: rec.description, uploadedBy: rec.uploadedBy,
            timestamp: Number(rec.timestamp), isActive: rec.isActive };
        })
      );
      setRecords(loaded.filter(r => r.isActive));
    } catch (e) {
      toast.error(e.reason || "Access denied or patient not found");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    const target = isPatient ? account : patientAddr;
    if (!target || !file) return toast.error("Please select a file and fill all fields");

    setUploading(true);
    try {
      // 1. Encrypt & upload to IPFS via backend
      toast.loading("Encrypting & uploading to IPFS…", { id: "upload" });
      const ipfsHash = await uploadToIPFS(file, target);

      // 2. Register hash on blockchain
      toast.loading("Storing hash on blockchain…", { id: "upload" });
      const tx = await contract.uploadRecord(target, ipfsHash, recordType, description);
      await tx.wait();

      toast.success("Record uploaded successfully!", { id: "upload" });
      setShowUpload(false);
      setFile(null);
      setDescription("");
      if (isPatient) loadPatientRecords(account);
    } catch (e) {
      toast.error(e.reason || e.message || "Upload failed", { id: "upload" });
    } finally {
      setUploading(false);
    }
  }

  const formatDate = (ts) => ts
    ? new Date(ts * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  const RECORD_ICONS = { "Lab Report": "🧪", "Prescription": "💊", "Scan": "🔬",
    "Discharge": "🏥", "Vaccination": "💉", "Other": "📄" };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title={isPatient ? "My Medical Records" : "Patient Records"}
        subtitle={isPatient ? "All your encrypted health records stored on IPFS" : "Access consented patient records"}
        action={
          <Button onClick={() => setShowUpload(!showUpload)} size="sm">
            {showUpload ? "✕ Cancel" : "+ Upload Record"}
          </Button>
        }
      />

      {/* Doctor search */}
      {isDoctor && !showUpload && (
        <Card className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Enter Patient Address to View Records</p>
          <div className="flex gap-3">
            <Input
              placeholder="0x patient wallet address..."
              value={patientAddr}
              onChange={e => setPatientAddr(e.target.value)}
              className="flex-1"
            />
            <Button onClick={loadDoctorPatientRecords} size="sm">Load Records</Button>
          </div>
        </Card>
      )}

      {/* Upload form */}
      {showUpload && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <h3 className="font-semibold text-gray-900 mb-4">📤 Upload New Medical Record</h3>
          <div className="space-y-4">
            {isDoctor && (
              <Input
                label="Patient Wallet Address"
                placeholder="0x..."
                value={patientAddr}
                onChange={e => setPatientAddr(e.target.value)}
              />
            )}
            <Select
              label="Record Type"
              options={RECORD_TYPES}
              value={recordType}
              onChange={e => setRecordType(e.target.value)}
            />
            <Input
              label="Description"
              placeholder="Brief description (e.g. CBC Test - March 2026)"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Medical File (PDF/Image)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.dicom"
                onChange={e => setFile(e.target.files[0])}
                className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 file:font-medium hover:file:bg-blue-200"
              />
              <p className="text-xs text-gray-400">File will be AES-256 encrypted before upload to IPFS</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleUpload} disabled={uploading || !file}>
                {uploading ? "Uploading…" : "🔐 Encrypt & Upload"}
              </Button>
              <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Records list */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : records.length === 0 ? (
        <EmptyState icon="📋" title="No records yet"
          description="Upload your first medical record to get started. All files are encrypted and stored securely." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map(rec => (
            <Card key={rec.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{RECORD_ICONS[rec.recordType] || "📄"}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                  #{rec.id}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">{rec.recordType}</h3>
              <p className="text-sm text-gray-500 mt-1 mb-3">{rec.description || "No description"}</p>
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>📅 {formatDate(rec.timestamp)}</span>
                  <span>By <AddressChip address={rec.uploadedBy} /></span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span>🔗 IPFS:</span>
                  <span className="font-mono truncate max-w-[120px]">{rec.ipfsHash}</span>
                </div>
              </div>
              <a
                href={`https://ipfs.io/ipfs/${rec.ipfsHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 w-full text-center text-xs text-blue-600 hover:text-blue-800 block"
              >
                View on IPFS ↗
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
