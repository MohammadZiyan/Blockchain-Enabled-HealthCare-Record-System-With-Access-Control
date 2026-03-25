import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { Card, RoleBadge, AddressChip, SectionHeader, Spinner } from "../components/UI";

export default function DashboardPage() {
  const { contract, account, userProfile } = useWeb3();
  const [stats, setStats] = useState({ records: 0, grants: 0, auditCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!contract || !account || !userProfile?.isRegistered) return;
      try {
        if (userProfile.role === "Patient") {
          const ids = await contract.getPatientRecordIds(account);
          const auditCount = await contract.getAuditCount();
          setStats({ records: ids.length, auditCount: Number(auditCount) });
        } else {
          const auditCount = await contract.getAuditCount();
          setStats({ auditCount: Number(auditCount) });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [contract, account, userProfile]);

  if (loading) return (
    <div className="flex justify-center items-center py-24">
      <Spinner size="lg" />
    </div>
  );

  const patientQuickActions = [
    { to: "/records",  icon: "📋", label: "My Records",       desc: "View & upload medical records"    },
    { to: "/access",   icon: "🔑", label: "Manage Access",    desc: "Grant or revoke doctor access"    },
    { to: "/audit",    icon: "🕵️", label: "Audit Log",        desc: "See who accessed your data"       },
  ];

  const doctorQuickActions = [
    { to: "/records",  icon: "📋", label: "Patient Records",  desc: "Access consented patient records" },
    { to: "/audit",    icon: "🕵️", label: "Audit Log",        desc: "Activity trail"                   },
  ];

  const actions = userProfile.role === "Doctor" || userProfile.role === "Hospital"
    ? doctorQuickActions
    : patientQuickActions;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">
                Welcome back, {userProfile.name || "User"} 👋
              </h1>
              <RoleBadge role={userProfile.role} />
            </div>
            <div className="flex items-center gap-2 opacity-80 text-sm">
              <AddressChip address={account} />
              {userProfile.institution && (
                <span>• {userProfile.institution}</span>
              )}
            </div>
          </div>
          <div className="hidden md:block text-5xl opacity-30">
            {userProfile.role === "Patient"  ? "🏥" :
             userProfile.role === "Doctor"   ? "👨‍⚕️" :
             userProfile.role === "Hospital" ? "🏨" : "⚙️"}
          </div>
        </div>
      </div>

      {/* Stats */}
      {userProfile.role === "Patient" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Medical Records",   value: stats.records,    icon: "📋", color: "blue"   },
            { label: "Blockchain Events", value: stats.auditCount, icon: "⛓",  color: "purple" },
            { label: "Account Status",    value: "Active",         icon: "✅", color: "green"  },
          ].map((s, i) => (
            <Card key={i} className="text-center">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <SectionHeader title="Quick Actions" subtitle="Everything you need, one click away" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {actions.map((a, i) => (
          <Link key={i} to={a.to}>
            <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
              <div className="text-3xl mb-3">{a.icon}</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {a.label}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{a.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* System info */}
      <Card className="bg-gray-50">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">🔗 Blockchain Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Network</p>
            <p className="font-medium text-gray-800">Ethereum (Hardhat Local)</p>
          </div>
          <div>
            <p className="text-gray-400">Your Role</p>
            <RoleBadge role={userProfile.role} />
          </div>
          <div>
            <p className="text-gray-400">Total On-Chain Events</p>
            <p className="font-medium text-gray-800">{stats.auditCount}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
