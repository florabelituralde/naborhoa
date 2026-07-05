import React, { useState, useEffect } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/StatusBadge";
import RequestProgress from "@/components/RequestProgress";
import { Button } from "@/components/ui/button";
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
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate("/home/requests")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Requests
      </button>

      <div className="bg-card rounded-2xl warm-shadow p-5 sm:p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold">{request.title}</h1>
          <StatusBadge status={request.status} />
        </div>
        <p className="text-muted-foreground mb-6">{request.description}</p>

        <div className="mb-6 pb-6 border-b border-border">
          <RequestProgress status={request.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Category: </span><span className="font-medium capitalize">{request.category}</span></div>
          <div><span className="text-muted-foreground">Priority: </span><span className="font-medium capitalize">{request.priority}</span></div>
          <div><span className="text-muted-foreground">Submitted: </span><span className="font-medium">{formatDate(request.created_date)}</span></div>
          <div><span className="text-muted-foreground">Assigned: </span><span className="font-medium">{request.assigned_to_id ? "Yes" : "Pending"}</span></div>
        </div>

        {request.image_url && (
          <div className="mt-4">
            <img src={request.image_url} alt="Request" className="rounded-xl max-h-64 object-cover" />
          </div>
        )}
      </div>

      {request.resolution_notes && (
        <div className="bg-card rounded-2xl warm-shadow p-6 mb-6">
          <h2 className="font-semibold mb-2">Resolution Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.resolution_notes}</p>
        </div>
      )}

      {canCancel && (
        <Button variant="outline" onClick={cancelRequest}>
          <X className="w-4 h-4 mr-2" /> Cancel Request
        </Button>
      )}
    </div>
  );
}