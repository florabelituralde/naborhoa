import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, Play } from "lucide-react";
import RequestAssignPanel from "@/components/hoa/RequestAssignPanel";

// Self-contained request management panel used by HOA admins and approved
// board members. Tracks who performs each action (actor_name on the activity
// log, approved_by_name on approval) so homeowners can see who did what.
export default function RequestManagePanel({ request, community, onUpdated }) {
  const [me, setMe] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState(request.resolution_notes || "");
  const [startDate, setStartDate] = useState(request.start_date || "");
  const [endDate, setEndDate] = useState(request.end_date || "");
  const [infoMessage, setInfoMessage] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);
  useEffect(() => {
    setResolutionNotes(request.resolution_notes || "");
    setStartDate(request.start_date || "");
    setEndDate(request.end_date || "");
  }, [request.id, request.resolution_notes, request.start_date, request.end_date]);

  const actorName = me?.full_name || "HOA";
  const actorId = me?.id;

  const buildEntries = (updates) => {
    const now = new Date().toISOString();
    const entries = [];
    if (updates.status) {
      const labels = {
        in_progress: "Work started — request in progress",
        resolved: "Request resolved and completed",
        cancelled: "Request cancelled",
        submitted: "Request reopened",
        approved: "Request approved",
        info_requested: "More details requested from homeowner",
      };
      entries.push({ type: "status_change", status: updates.status, label: labels[updates.status] || `Status changed to ${updates.status}`, actor_name: actorName, timestamp: now });
    }
    if (updates.assignee_type !== undefined) {
      if (updates.assignee_type === "none") {
        entries.push({ type: "unassigned", label: "Assignment removed", actor_name: actorName, timestamp: now });
      } else if (updates.assignee_type === "vendor") {
        entries.push({ type: "assigned", label: `Assigned to vendor: ${updates.assigned_to_name}`, actor_name: actorName, timestamp: now });
      } else if (updates.assignee_type === "other") {
        entries.push({ type: "assigned", label: `Assigned to ${updates.assigned_to_name}`, actor_name: actorName, timestamp: now });
      }
    }
    if (updates.resolution_notes !== undefined && !updates.status) {
      entries.push({ type: "note", label: "Resolution notes updated", actor_name: actorName, timestamp: now });
    }
    return entries;
  };

  const notify = (body) => {
    base44.entities.Notification.create({
      community_id: community.id,
      user_id: request.homeowner_id,
      type: "request_update",
      title: `Request "${request.title}" updated`,
      body,
      related_id: request.id,
    }).catch(() => {});
  };

  const updateRequest = async (updates) => {
    setUpdating(true);
    const payload = { ...updates };
    if (updates.status === "approved") {
      payload.approved_by_id = actorId;
      payload.approved_by_name = actorName;
    }
    const entries = buildEntries(updates);
    if (entries.length > 0) {
      payload.activity_log = [...(request.activity_log || []), ...entries];
    }
    try {
      const updated = await base44.entities.Request.update(request.id, payload);
      onUpdated(updated);
      if (updates.status) notify(`Status changed to ${updates.status.replace("_", " ")}`);
      if (updates.assignee_type && updates.assignee_type !== "none") notify(`Assigned to ${updates.assigned_to_name}`);
    } finally {
      setUpdating(false);
    }
  };

  const today = () => new Date().toISOString().slice(0, 10);
  const handleStartWork = () => {
    const u = { status: "in_progress" };
    if (!startDate) u.start_date = today();
    updateRequest(u);
    if (!startDate) setStartDate(today());
  };
  const handleResolve = () => {
    const u = { status: "resolved", resolution_notes: resolutionNotes };
    if (!endDate) u.end_date = today();
    updateRequest(u);
    if (!endDate) setEndDate(today());
  };
  const handleApprove = () => updateRequest({ status: "approved", resolution_notes: resolutionNotes });
  const handleAskInfo = () => {
    updateRequest({ status: "info_requested", info_request: infoMessage.trim() });
    setInfoMessage("");
  };

  return (
    <div className="bg-card rounded-2xl warm-shadow p-5 sm:p-8">
      <h2 className="font-semibold text-lg mb-4">Manage Request</h2>

      {request.category !== "plan_review" && (
        <>
          <RequestAssignPanel request={request} onSave={updateRequest} updating={updating} />

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>End / completion date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          {(startDate !== (request.start_date || "") || endDate !== (request.end_date || "")) && (
            <Button size="sm" variant="secondary" className="mb-6" onClick={() => updateRequest({ start_date: startDate || null, end_date: endDate || null })} disabled={updating}>
              Save Schedule
            </Button>
          )}
        </>
      )}

      {request.category === "plan_review" ? (
        <div className="space-y-3 mb-6">
          {request.status !== "approved" && request.status !== "cancelled" && (
            <Button onClick={handleApprove} disabled={updating}>
              <Check className="w-4 h-4 mr-2" /> Approve Request
            </Button>
          )}
          {request.status !== "info_requested" && request.status !== "approved" && request.status !== "cancelled" && (
            <div className="rounded-xl border border-border p-4">
              <Label>Ask homeowner for more details</Label>
              <Textarea value={infoMessage} onChange={(e) => setInfoMessage(e.target.value)} className="mt-1.5" rows={2} placeholder="Describe what information you need from the homeowner..." />
              <Button size="sm" variant="secondary" className="mt-2" onClick={handleAskInfo} disabled={updating || !infoMessage.trim()}>
                Request More Details
              </Button>
            </div>
          )}
          {request.status === "info_requested" && (
            <p className="text-sm text-amber-700 dark:text-amber-300">Waiting for the homeowner to provide more details.</p>
          )}
          {request.status === "approved" && (
            <p className="text-sm text-green-700 dark:text-green-300">This request has been approved{request.approved_by_name ? ` by ${request.approved_by_name}` : ""}.</p>
          )}
          {request.status !== "cancelled" && request.status !== "approved" && (
            <Button variant="outline" onClick={() => updateRequest({ status: "cancelled" })} disabled={updating}>
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 mb-6">
          {request.status === "submitted" && (
            <Button onClick={handleStartWork} disabled={updating}>
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
      )}

      <div>
        <Label>Resolution Notes</Label>
        <Textarea
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
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
  );
}