import React from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { Button } from "../components/UI";

export default function LandingPage() {
  const { connect, isConnecting, isConnected, userProfile, networkError } = useWeb3();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isConnected && userProfile?.isRegistered) navigate("/dashboard");
    else if (isConnected && !userProfile?.isRegistered) navigate("/register");
  }, [isConnected, userProfile, navigate]);

  const features = [
    { icon: "🔒", title: "Tamper-Proof Records",   desc: "Every record hash stored immutably on Ethereum. No unauthorized modifications possible." },
    { icon: "🔑", title: "Patient-Controlled Access", desc: "You decide who sees your data. Grant or revoke doctor access in real time." },
    { icon: "📋", title: "Full Audit Trail",        desc: "Every access event permanently logged on-chain with timestamps." },
    { icon: "🏥", title: "Inter-Hospital Sharing",  desc: "Securely share records across institutions without manual intermediaries." },
    { icon: "🔐", title: "AES-256 Encryption",      desc: "Files encrypted before leaving your device. IPFS stores only ciphertext." },
    { icon: "⚡", title: "Instant Access",           desc: "Doctors access verified records in seconds, not days. Faster, safer care." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span>⛓</span> Built on Ethereum Blockchain
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
          Your Health Records,<br/>
          <span className="text-blue-600">Secure & In Your Control</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          A decentralized Electronic Health Record system with role-based access control.
          No central authority. No data breaches. Full transparency.
        </p>

        {networkError && (
          <div className="mb-6 inline-flex items-center gap-2 bg-red-50 text-red-700 px-5 py-3 rounded-xl text-sm border border-red-200">
            ⚠️ {networkError}
          </div>
        )}

        <Button onClick={connect} disabled={isConnecting} size="lg" className="shadow-lg shadow-blue-200">
          {isConnecting ? (
            <><span className="animate-spin">⏳</span> Connecting…</>
          ) : (
            <><span>🦊</span> Connect MetaMask to Get Started</>
          )}
        </Button>
        <p className="text-xs text-gray-400 mt-4">
          Requires MetaMask + local Hardhat node or Sepolia testnet
        </p>
      </div>

      {/* Features grid */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 text-center py-6 text-sm text-gray-400">
        IILM University • School of Computer Science & Engineering • Major Project 2025-26
      </div>
    </div>
  );
}
