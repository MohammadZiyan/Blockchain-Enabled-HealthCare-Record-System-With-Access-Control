import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { Card, Button, Input, SectionHeader, AddressChip, Spinner } from "../components/UI";
import toast from "react-hot-toast";

const DURATION_OPTIONS = [
  { label: "1 Hour",    seconds: 3600           },
  { label: "1 Day",     seconds: 86400          },
  { label: "7 Days",    seconds: 7 * 86400      },
  { label: "30 Days",   seconds: 30 * 86400     },
  { label: "Permanent", seconds: 0              },
];

export default function AccessPage() {
  const { contract, account, userProfile } = useWeb3();
  const [grantee,   setGrantee]   = useState("");
  const [duration,  setDuration]  = useState(30 * 86400);
  const [granting,  setGranting]  = useState(false);
  const [revoking,  setRevoking]  = useState(null);
  const [checkAddr, setCheckAddr] = useState("");
  const [accessResult, setAccessResult] = useState(null);
  const [checking,  setChecking]  = useState(false);
  const [granteeInfo, setGranteeInfo] = useState(null);

  const isPatient = userProfile?.role === "Patient";

  async function lookupGrantee(addr) {
    if (!addr || !addr.startsWith("0x")) { setGranteeInfo(null); return; }
    try {
      const user = await contract.users(addr);
      const roleNum = Number(user.role);
      if (roleNum === 0) setGranteeInfo({ error: "Address not registered on this system" });
      else if (roleNum !== 1 && roleNum !== 3) setGranteeInfo({ error: "Address must be a Doctor or Hospital" });
      else setGranteeInfo({ name: user.name, institution: user.institution, role: roleNum === 1 ? "Doctor" : "Hospital" });
    } catch { setGranteeInfo(null); }
  }

  async function handleGrant() {
    if (!grantee.startsWith("0x")) return toast.error("Enter a valid address");
    if (granteeInfo?.error) return toast.error(granteeInfo.error);
    setGranting(true);
    try {
      const tx = await contract.grantAccess(grantee, duration);
      toast.loading("Granting access on blockchain…", { id: "grant" });
      await tx.wait();
      toast.success(`Access granted to ${granteeInfo?.name || grantee}!`, { id: "grant" });
      setGrantee(""); setGranteeInfo(null);
    } catch (e) {
      toast.error(e.reason || e.message, { id: "grant" });
    } finally {
      setGranting(false);
    }
  }

  async function handleRevoke(addr) {
    setRevoking(addr);
    try {
      const tx = await contract.revokeAccess(addr);
      toast.loading("Revoking access…", { id: "revoke" });
      await tx.wait();
      toast.success("Access revoked successfully", { id: "revoke" });
    } catch (e) {
      toast.error(e.reason || e.message, { id: "revoke" });
    } finally {
      setRevoking(null);
    }
  }

  async function handleCheckAccess() {
    if (!checkAddr.startsWith("0x")) return toast.error("Enter valid address");
    setChecking(true);
    try {
      const result = await contract.checkAccess(account, checkAddr);
      setAccessResult({ address: checkAddr, hasAccess: result });
    } catch (e) {
      toast.error(e.reason || e.message);
    } finally {
      setChecking(false);
    }
  }

  if (!isPatient) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-800">Patients Only</h2>
        <p className="text-gray-500 mt-2">Only patients can manage access control for their records.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title="Access Control"
        subtitle="Control who can view your medical records"
      />

      {/* Grant access */}
      <Card className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-1">🔑 Grant Record Access</h3>
        <p className="text-sm text-gray-500 mb-4">Allow a doctor or hospital to view your medical records</p>
        <div className="space-y-4">
          <div>
            <Input
              label="Doctor / Hospital Wallet Address"
              placeholder="0x..."
              value={grantee}
              onChange={e => { setGrantee(e.target.value); lookupGrantee(e.target.value); }}
            />
            {granteeInfo && !granteeInfo.error && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                <span>✅</span>
                <span><strong>{granteeInfo.name}</strong> • {granteeInfo.role} • {granteeInfo.institution}</span>
              </div>
            )}
            {granteeInfo?.error && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                ⚠️ {granteeInfo.error}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Access Duration</label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setDuration(opt.seconds)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border
                    ${duration === opt.seconds
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {duration === 0 && (
              <p className="text-xs text-amber-600 mt-1">⚠️ Permanent access — remember to revoke when no longer needed</p>
            )}
          </div>

          <Button onClick={handleGrant} disabled={granting || !grantee || !!granteeInfo?.error}>
            {granting ? "Granting…" : "Grant Access"}
          </Button>
        </div>
      </Card>

      {/* Revoke access */}
      <Card className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-1">🚫 Revoke Access</h3>
        <p className="text-sm text-gray-500 mb-4">Remove a previously granted access</p>
        <div className="flex gap-3">
          <Input
            placeholder="0x doctor/hospital address..."
            value={revoking || ""}
            onChange={() => {}}
            className="flex-1"
          />
          <Input
            placeholder="0x doctor address to revoke..."
            className="flex-1"
            id="revoke-input"
          />
        </div>
        <div className="flex gap-3 mt-3">
          <Input
            placeholder="Paste doctor/hospital address to revoke..."
            id="revoke-addr"
            className="flex-1"
          />
          <Button
            variant="danger"
            disabled={!!revoking}
            onClick={() => {
              const addr = document.getElementById("revoke-addr")?.value;
              if (addr) handleRevoke(addr);
            }}
          >
            {revoking ? "Revoking…" : "Revoke"}
          </Button>
        </div>
      </Card>

      {/* Check access */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-1">🔍 Check Access Status</h3>
        <p className="text-sm text-gray-500 mb-4">Verify if a specific address can access your records</p>
        <div className="flex gap-3">
          <Input
            placeholder="0x address to check..."
            value={checkAddr}
            onChange={e => setCheckAddr(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleCheckAccess} disabled={checking} variant="outline">
            {checking ? <Spinner size="sm" /> : "Check"}
          </Button>
        </div>
        {accessResult && (
          <div className={`mt-3 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
            ${accessResult.hasAccess ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {accessResult.hasAccess ? "✅ Has active access" : "🚫 No access"}
            <AddressChip address={accessResult.address} />
          </div>
        )}
      </Card>
    </div>
  );
}
