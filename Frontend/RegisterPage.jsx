import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { Card, Button, Input } from "../components/UI";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const { contract, account, userProfile, refreshProfile } = useWeb3();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (userProfile?.isRegistered) navigate("/dashboard");
  }, [userProfile, navigate]);

  async function handleRegister() {
    if (!name.trim()) return toast.error("Please enter your name");
    setLoading(true);
    try {
      const tx = await contract.registerPatient(name.trim());
      toast.loading("Registering on blockchain…", { id: "reg" });
      await tx.wait();
      toast.success("Registered successfully!", { id: "reg" });
      await refreshProfile();
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.reason || err.message || "Registration failed", { id: "reg" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🏥
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Your Health Profile</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Register as a patient on the EHR blockchain. Your identity is tied to your wallet address.
          </p>
        </div>

        <Card>
          <div className="space-y-5">
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-semibold mb-1">Your Wallet Address</p>
              <p className="font-mono text-xs break-all">{account}</p>
            </div>

            <Input
              label="Full Name"
              placeholder="e.g. Priya Sharma"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleRegister()}
            />

            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p>✅ Your wallet address becomes your unique patient ID</p>
              <p>✅ No personal data stored on-chain — only your name & role</p>
              <p>✅ Medical records stored encrypted on IPFS</p>
            </div>

            <Button onClick={handleRegister} disabled={loading || !name.trim()} className="w-full">
              {loading ? "Registering…" : "Register as Patient"}
            </Button>

            <p className="text-center text-xs text-gray-400">
              Are you a Doctor or Hospital?{" "}
              <span className="text-blue-600 font-medium">
                Contact the system admin to register.
              </span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
