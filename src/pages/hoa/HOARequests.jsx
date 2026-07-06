import React, { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Loader2, ChevronRight } from "lucide-react";
import { titleCase } from "@/lib/format";

const FILTERS = ["all", "submitted", "in_progress", "resolved", "cancelled"];

export default function HOARequests() {
  const { community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!community) {
      setLoading(false);
      return;
    }
    setLoading(true);
    base44.entities.Request.filter({ community_id: community.id }, "-created_date")
      .then(reqs => setRequests(reqs))
      .finally(() => setLoading(false));
  }, [community]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <PageHeader title="Requests" subtitle="Manage all community maintenance and repair requests" />
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
          >
            {titleCase(f)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <p className="text-muted-foreground">No requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <Link
              key={req.id}
              to={`/hoa/requests/${req.id}`}
              className="bg-card rounded-2xl warm-shadow p-5 flex items-center justify-between hover:warm-shadow-md transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold truncate">{req.title}</h3>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-sm text-muted-foreground truncate">{req.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{req.request_type_name || (req.category || "").replace("_", " ")}</span>
                  <span className="capitalize">Priority: {req.priority}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground ml-4 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}