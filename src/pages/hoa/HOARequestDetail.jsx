import React, { useState, useEffect } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/StatusBadge";
import MobileTopHeader from "@/components/mobile/MobileTopHeader";
import { Loader2, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/format";
import RequestAttachments from "@/components/RequestAttachments";
import RequestManagePanel from "@/components/hoa/RequestManagePanel";

export default function HOARequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [homeowner, setHomeowner] = useState(null);

  useEffect(() => {
    base44.entities.Request.get(id)
      .then((req) => {
        setRequest(req);
        if (req.homeowner_id) {
          base44.entities.User.get(req.homeowner_id).then((h) => setHomeowner(h)).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!request) return <div className="p-8 text-center text-muted-foreground">Request not found</div>;

  return (
    <>
      <MobileTopHeader title={request.title} backTo="/hoa/requests" />
      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        <button onClick={() => navigate("/hoa/requests")} className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Requests
        </button>

        <div className="bg-card rounded-2xl warm-shadow p-5 sm:p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold">{request.title}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-muted-foreground mb-6">{request.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {request.request_type_name && <div><span className="text-muted-foreground">Type: </span><span className="font-medium">{request.request_type_name}</span></div>}
            <div><span className="text-muted-foreground">Category: </span><span className="font-medium capitalize">{(request.category || "").replace("_", " ")}</span></div>
            <div><span className="text-muted-foreground">Priority: </span><span className="font-medium capitalize">{request.priority}</span></div>
            <div><span className="text-muted-foreground">Submitted: </span><span className="font-medium">{formatDate(request.created_date)}</span></div>
            <div><span className="text-muted-foreground">Homeowner: </span><span className="font-medium">{homeowner?.full_name || "Unknown"}</span></div>
            {request.contact_phone && <div><span className="text-muted-foreground">Phone: </span><a href={`tel:${request.contact_phone}`} className="font-medium text-primary">{request.contact_phone}</a></div>}
            {request.contact_email && <div><span className="text-muted-foreground">Email: </span><a href={`mailto:${request.contact_email}`} className="font-medium text-primary">{request.contact_email}</a></div>}
          </div>

          {request.custom_answers?.length > 0 && (
            <div className="mt-6 border-t border-border pt-4 grid sm:grid-cols-2 gap-3 text-sm">
              {request.custom_answers.map((a, i) => (
                <div key={i}><span className="text-muted-foreground">{a.label}: </span><span className="font-medium">{a.value}</span></div>
              ))}
            </div>
          )}

          <RequestAttachments attachments={request.attachments} image_url={request.image_url} />
        </div>

        <RequestManagePanel request={request} community={community} onUpdated={setRequest} />
      </div>
    </>
  );
}