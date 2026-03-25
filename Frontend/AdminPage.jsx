import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { Card, Button, Input, SectionHeader } from "../components/UI";
import toast from "react-hot-toast";

export default function AdminPage() {
  const { contract, userProfile } = useWeb3();
  const [doctorAddr,   setDoctorAddr]   = useState("");
  const [doctorName,   setDoctorName]   = useState("");
  const [institution,  setInstitution]  = useState("");
  const [hospAddr,     setHospAddr]     = useState("");
  const [hospName,     setHospName]     = useState("");
  const [deactAddr,    setDeactAddr]    = useState("");
  const [loading,      setLoading]      = useState(null);

  if (userProfile?.role !== "Admin") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">⛔</div>
        <h2 className="text-xl font-bold text-gray-800">Admin Only</h2>
        <p className="text-gray-500 mt-2">You do not have administrative privileges.</p>
      </div>
    );
  }

  async function handleRegisterDoctor() {
    if (!doctorAddr || !doctorName || !institution)
      return toast.error("Fill all doctor fields");
    setLoading("doctor");
    try {
      const tx = await contract.registerDoctor(doctorAddr, doctorName, institution);
      toast.loading("Registering doctor on blockchain…", { id: "doc" });
      await tx.wait();
      toast.success(`Dr. ${doctorName} registered!`, { id: "doc" });
      setDoctorAddr(""); setDoctorName(""); setInstitution("");
    } catch (e) {
      toast.error(e.reason || e.message, { id: "doc" });
    } finally { setLoading(null); }
  }

  async function handleRegisterHospital() {
    if (!hospAddr || !hospName) return toast.error("Fill all hospital fields");
    setLoading("hospital");
    try {
      const tx = await contract.registerHospital(hospAddr, hospName);
      toast.loading("Registering hospital on blockchain…", { id: "hosp" });
      await tx.wait();
      toast.success(`${hospName} registered!`, { id: "hosp" });
      setHospAddr(""); setHospName("");
    } catch (e) {
      toast.error(e.reason || e.message, { id: "hosp" });
    } finally { setLoading(null); }
  }

  async function handleDeactivate() {
    if (!deactAddr) return toast.error("Enter an address");
    setLoading("deact");
    try {
      const tx = await contract.deactivateUser(deactAddr);
      toast.loading("Deactivating user…", { id: "deact" });
      await tx.wait();
      toast.success("User deactivated", { id: "deact" });
      setDeactAddr("");
    } catch (e) {
      toast.error(e.reason || e.message, { id: "deact" });
    } finally { setLoading(null); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader title="⚙️ Admin Panel" subtitle="Manage users, doctors, and hospitals" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Register Doctor */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">👨‍⚕️ Register Doctor</h3>
          <div className="space-y-3">
            <Input label="Wallet Address" placeholder="0x..." value={doctorAddr} onChange={e => setDoctorAddr(e.target.value)} />
            <Input label="Full Name" placeholder="Dr. Arjun Sharma" value={doctorName} onChange={e => setDoctorName(e.target.value)} />
            <Input label="Institution" placeholder="AIIMS New Delhi" value={institution} onChange={e => setInstitution(e.target.value)} />
            <Button onClick={handleRegisterDoctor} disabled={loading === "doctor"} className="w-full">
              {loading === "doctor" ? "Registering…" : "Register Doctor"}
            </Button>
          </div>
        </Card>

        {/* Register Hospital */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">🏥 Register Hospital</h3>
          <div className="space-y-3">
            <Input label="Wallet Address" placeholder="0x..." value={hospAddr} onChange={e => setHospAddr(e.target.value)} />
            <Input label="Hospital Name" placeholder="Max Super Specialty Hospital" value={hospName} onChange={e => setHospName(e.target.value)} />
            <Button onClick={handleRegisterHospital} disabled={loading === "hospital"} className="w-full">
              {loading === "hospital" ? "Registering…" : "Register Hospital"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Deactivate */}
      <Card className="mt-6 border-red-100">
        <h3 className="font-semibold text-red-700 mb-4">⚠️ Deactivate User</h3>
        <div className="flex gap-3">
          <Input placeholder="0x user address to deactivate..." value={deactAddr}
            onChange={e => setDeactAddr(e.target.value)} className="flex-1" />
          <Button variant="danger" onClick={handleDeactivate} disabled={loading === "deact"}>
            {loading === "deact" ? "…" : "Deactivate"}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">This action is recorded on-chain and cannot be undone by non-admins.</p>
      </Card>
    </div>
  );
}
