import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { RoleBadge, AddressChip, Button } from "./UI";

export default function Navbar() {
  const { account, userProfile, connect, isConnecting, isConnected } = useWeb3();
  const loc = useLocation();

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/records",   label: "Records"   },
    { to: "/access",    label: "Access Control" },
    { to: "/audit",     label: "Audit Log" },
    ...(userProfile?.role === "Admin" ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">⛓</span>
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm">EHR</span>
              <span className="font-bold text-blue-600 text-sm">Chain</span>
              <p className="text-xs text-gray-400 leading-none -mt-0.5">IILM University</p>
            </div>
          </Link>

          {/* Nav links */}
          {isConnected && userProfile?.isRegistered && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${loc.pathname === link.to
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Wallet */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">
                    {userProfile?.name || "Unregistered"}
                  </span>
                  <AddressChip address={account} />
                </div>
                {userProfile?.role && <RoleBadge role={userProfile.role} />}
              </div>
            ) : (
              <Button onClick={connect} disabled={isConnecting} size="sm">
                {isConnecting ? "Connecting…" : "🦊 Connect Wallet"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
