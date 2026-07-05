import React, { useState, useEffect } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Check, X, Play } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function HOARequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [homeowner, setHomeowner] = useState(null);
  const [staff, setStaff] = useState([]);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Request.get(id),
      base44.entities.User.filter({ community_id: community.id, role: "hoa_staff" }),
    ]).then(([req, staffList]) => {
      setRequest(req);
      setStaff(staffList);
      setResolutionNotes(req.resolution_notes || "");
      if (req.homeowner_id) {
        base44.entities.User.get(req.homeowner_id).then(h => setHomeowner(h)).catch(() => {});
      }
      setLoading(false);
    });
  }, [id, community]);

  const updateRequest = async (updates) => {
    setUpdating(true);
    const updated = await base44.entities.Request.update(id, updates);
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
    setUpdating(false);
  };

  const handleResolve = () => {
    updateRequest({ status: "resolved", resolution_notes: resolutionNotes });
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!request) return <div className="p-8 text-center text-muted-foreground">Request not found</div>;

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate("/hoa/requests")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Requests
      </button>

      <div className="bg-card rounded-2xl warm-shadow p-5 sm:p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold">{request.title}</h1>
          <StatusBadge status={request.status} />
        </div>
        <p className="text-muted-foreground mb-6">{request.description}</p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Category: </span><span className="font-medium capitalize">{request.category}</span></div>
          <div><span className="text-muted-foreground">Priority: </span><span className="font-medium capitalize">{request.priority}</span></div>
          <div><span className="text-muted-foreground">Submitted: </span><span className="font-medium">{formatDate(request.created_date)}</span></div>
          <div><span className="text-muted-foreground">Homeowner: </span><span className="font-medium">{homeowner?.full_name || "Unknown"}</span></div>
        </div>

        {request.image_url && (
          <div className="mt-4">
            <img src={request.image_url} alt="Request" className="rounded-xl max-h-64 object-cover" />
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl warm-shadow p-5 sm:p-8">
        <h2 className="font-semibold text-lg mb-4">Manage Request</h2>

        <div className="mb-6">
          <Label>Assign to Staff</Label>
          <Select
            value={request.assigned_to_id || "_none"}
            onValueChange={(val) => updateRequest({ assigned_to_id: val === "_none" ? "" : val })}
          >
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select staff member" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Unassigned</SelectItem>
              {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          {staff.length === 0 && <p className="text-xs text-muted-foreground mt-2">No staff members yet.</p>}
        </div>

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
  );
}