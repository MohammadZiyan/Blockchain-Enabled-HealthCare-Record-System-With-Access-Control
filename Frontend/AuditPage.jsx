import React, { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { Card, SectionHeader, AddressChip, Spinner, EmptyState } from "../components/UI";
import toast from "react-hot-toast";

const ACTION_META = {
  DEPLOY:             { icon: "🚀", color: "bg-gray-100  text-gray-700"  },
  REGISTER_PATIENT:   { icon: "👤", color: "bg-green-100 text-green-700" },
  REGISTER_DOCTOR:    { icon: "👨‍⚕️", color: "bg-blue-100  text-blue-700"  },
  REGISTER_HOSPITAL:  { icon: "🏥", color: "bg-purple-100 text-purple-700" },
  UPLOAD:             { icon: "📤", color: "bg-blue-100  text-blue-700"  },
  ACCESS:             { icon: "👁️",  color: "bg-yellow-100 text-yellow-700" },
  GRANT_ACCESS:       { icon: "🔑", color: "bg-green-100 text-green-700" },
  REVOKE_ACCESS:      { icon: "🚫", color: "bg-red-100   text-red-700"   },
  DEACTIVATE_USER:    { icon: "⛔", color: "bg-red-100   text-red-700"   },
};

export default function AuditPage() {
  const { contract, userProfile } = useWeb3();
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const PER_PAGE = 20;

  useEffect(() => { loadAudit(); }, [contract]);

  async function loadAudit() {
    if (!contract) return;
    setLoading(true);
    try {
      const count = await contract.getAuditCount();
      setTotal(Number(count));

      // Load last PER_PAGE entries
      const start = Math.max(1, Number(count) - PER_PAGE + 1);
      const loaded = [];
      for (let i = Number(count); i >= start; i--) {
        try {
          const e = await contract.getAuditEntry(i);
          loaded.push({
            id:        i,
            actor:     e.actor,
            action:    e.action,
            subject:   e.subject,
            recordId:  Number(e.recordId),
            timestamp: Number(e.timestamp),
          });
        } catch { /* skip unauthorized entries */ }
      }
      setEntries(loaded);
    } catch (e) {
      toast.error("Failed to load audit log: " + (e.reason || e.message));
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (ts) =>
    new Date(ts * 1000).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title="Blockchain Audit Log"
        subtitle={`${total} total events recorded immutably on-chain`}
      />

      <div className="mb-4 flex items-center gap-2 text-sm bg-amber-50 text-amber-700 px-4 py-3 rounded-xl border border-amber-200">
        ⛓ All entries below are permanently recorded on the Ethereum blockchain and cannot be modified.
      </div>

      {entries.length === 0 ? (
        <EmptyState icon="📋" title="No audit entries" description="Blockchain events will appear here." />
      ) : (
        <div className="space-y-3">
          {entries.map(e => {
            const meta = ACTION_META[e.action] || { icon: "📌", color: "bg-gray-100 text-gray-700" };
            return (
              <Card key={e.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Event # */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-sm font-bold text-gray-500">
                    {e.id}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
                        {meta.icon} {e.action.replace(/_/g, " ")}
                      </span>
                      {e.recordId > 0 && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          Record #{e.recordId}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>Actor: <AddressChip address={e.actor} /></span>
                      {e.subject !== "0x0000000000000000000000000000000000000000" && e.subject !== e.actor && (
                        <span>Subject: <AddressChip address={e.subject} /></span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-xs text-gray-400 text-right">
                    {formatDate(e.timestamp)}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {total > PER_PAGE && (
        <p className="text-center text-sm text-gray-400 mt-6">
          Showing last {entries.length} of {total} events.
          Full history available via direct blockchain query.
        </p>
      )}
    </div>
  );
}
