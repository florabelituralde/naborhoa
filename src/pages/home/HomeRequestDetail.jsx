import React, { useState, useEffect } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/StatusBadge";
import RequestProgress from "@/components/RequestProgress";
import RequestTimeline from "@/components/RequestTimeline";
import { Button } from "@/components/ui/button";
import MobileTopHeader from "@/components/mobile/MobileTopHeader";
import { Loader2, ArrowLeft, X } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function HomeRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);

  useEffect(() => {
    base44.entities.Request.get(id).then(req => {
      setRequest(req);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const cancelRequest = async () => {
    const updated = await base44.entities.Request.update(id, { status: "cancelled" });
    setRequest(updated);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!request) return <div className="p-8 text-center text-muted-foreground">Request not found</div>;

  const canCancel = request.status === "submitted" && request.homeowner_id === user.id;

  return (
    <>
    <MobileTopHeader title={request.title} backTo="/home/requests" />
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate("/home/requests")} className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Requests
      </button>
...
      {canCancel && (
        <Button variant="outline" onClick={cancelRequest}>
          <X className="w-4 h-4 mr-2" /> Cancel Request
        </Button>
      )}
    </div>
    </>
  );
}