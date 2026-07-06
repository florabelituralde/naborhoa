import React, { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronRight, Plus } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function HomeRequests() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!community) return;
    base44.entities.Request.filter({ community_id: community.id, homeowner_id: user.id }, "-created_date").then(reqs => {
      setRequests(reqs);
      setLoading(false);
    });
  }, [community, user]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="My Requests"
        subtitle="Track your maintenance and repair requests"
        action={<Button asChild><Link to="/home/requests/new"><Plus className="w-4 h-4 mr-2" /> New Request</Link></Button>}
      />
      {requests.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <p className="text-muted-foreground mb-4">You haven't submitted any requests yet</p>
          <Button asChild><Link to="/home/requests/new"><Plus className="w-4 h-4 mr-2" /> Submit a Request</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <Link
              key={req.id}
              to={`/home/requests/${req.id}`}
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
                  <span>{formatDate(req.created_date)}</span>
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