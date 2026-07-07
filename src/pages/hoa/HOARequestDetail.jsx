import React, { useState, useEffect } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import MobileTopHeader from "@/components/mobile/MobileTopHeader";
import { Loader2, ArrowLeft, Check, X, Play } from "lucide-react";
import { formatDate } from "@/lib/format";
import RequestAttachments from "@/components/RequestAttachments";
import RequestAssignPanel from "@/components/hoa/RequestAssignPanel";

export default function HOARequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [homeowner, setHomeowner] = useState(null);
  const [boardMembers, setBoardMembers] = useState([]);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const reqPromise = base44.entities.Request.get(id);
    const membersPromise = community?.id
      ? base44.entities.BoardMember.filter({ community_id: community.id }).catch(() => [])
      : Promise.resolve([]);
    Promise.all([reqPromise, membersPromise])
      .then(([req, members]) => {
        setRequest(req);
        setBoardMembers(members);
        setResolutionNotes(req.resolution_notes || "");
        if (req.homeowner_id) {
          base44.entities.User.get(req.homeowner_id).then(h => setHomeowner(h)).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, community]);

  const buildActivityEntries = (updates) => {
    const now = new Date().toISOString();
    const entries = [];
    if (updates.status) {
      const labels = {
        in_progress: "Work started — request in progress",
        resolved: "Request resolved and completed",
        cancelled: "Request cancelled",
        submitted: "Request reopened",
      };
      entries.push({ type: "status_change", status: updates.status, label: labels[updates.status] || `Status changed to ${updates.status}`, timestamp: now });
    }
    if (updates.assignee_type !== undefined) {
      if (updates.assignee_type === "none") {
        entries.push({ type: "unassigned", label: "Assignment removed", timestamp: now });
      } else if (updates.assignee_type === "staff") {
        entries.push({ type: "assigned", label: `Assigned to ${updates.assigned_to_name || "board member"}`, timestamp: now });
      } else if (updates.assignee_type === "vendor") {
        entries.push({ type: "assigned", label: `Assigned to vendor: ${updates.assigned_to_name}`, timestamp: now });
      } else if (updates.assignee_type === "other") {
        entries.push({ type: "assigned", label: `Assigned to ${updates.assigned_to_name}`, timestamp: now });
      }
    }
    if (updates.resolution_notes !== undefined && !updates.status) {
      entries.push({ type: "note", label: "Resolution notes updated", timestamp: now });
    }
    return entries;
  };

  const updateRequest = async (updates) => {
    setUpdating(true);
    const newEntries = buildActivityEntries(updates);
    const payload = { ...updates };
    if (newEntries.length > 0) {
      payload.activity_log = [...(request.activity_log || []), ...newEntries];
    }
    const updated = await base44.entities.Request.update(id, payload);
    setRequest(updated);
    if (updates.status) {
      await base44.entities.Notification.create({
        community_id: community.id,
        user_id: request.homeowner_id,
        type: "request_update",
        title: `Request "${request.title}" updated`,
        body: `Status changed to ${updates.status.replace("_", " ")}`,
        related_id: id,
      });
    }
    if (updates.assignee_type && updates.assignee_type !== "none") {
      await base44.entities.Notification.create({
        community_id: community.id,
        user_id: request.homeowner_id,
        type: "request_update",
        title: `Request "${request.title}" assigned`,
        body: `Assigned to ${updates.assigned_to_name}`,
        related_id: id,
      });
    }
    setUpdating(false);
  };

  const handleResolve = () => {
    updateRequest({ status: "resolved", resolution_notes: resolutionNotes });
  };

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

      <div className="bg-card rounded-2xl warm-shadow p-5 sm:p-8">
        <h2 className="font-semibold text-lg mb-4">Manage Request</h2>

        <RequestAssignPanel request={request} boardMembers={boardMembers} onSave={updateRequest} updating={updating} />

        <div className="flex flex-wrap gap-3 mb-6">
          {request.status === "submitted" && (
            <Button onClick={() => updateRequest({ status: "in_progress" })} disabled={updating}>
              <Play className="w-4 h-4 mr-2" /> Start Work
            </Button>
          )}
          {request.status === "in_progress" && (
            <Button onClick={handleResolve} disabled={updating}>
              <Check className="w-4 h-4 mr-2" /> Mark Resolved
            </Button>
          )}
          {request.status !== "cancelled" && request.status !== "resolved" && (
            <Button variant="outline" onClick={() => updateRequest({ status: "cancelled" })} disabled={updating}>
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
          )}
        </div>

        <div>
          <Label>Resolution Notes</Label>
          <Textarea
            value={resolutionNotes}
            onChange={e => setResolutionNotes(e.target.value)}
            className="mt-1.5"
            rows={4}
            placeholder="Add notes about the resolution..."
          />
          {resolutionNotes !== (request.resolution_notes || "") && (
            <Button size="sm" className="mt-2" onClick={() => updateRequest({ resolution_notes: resolutionNotes })} disabled={updating}>
              Save Notes
            </Button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}