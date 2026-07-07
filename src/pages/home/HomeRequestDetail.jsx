import React, { useState, useEffect } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/StatusBadge";
import RequestProgress from "@/components/RequestProgress";
import RequestTimeline from "@/components/RequestTimeline";
import RequestAttachments from "@/components/RequestAttachments";
import RequestManagePanel from "@/components/hoa/RequestManagePanel";
import RequestEditDialog from "@/components/RequestEditDialog";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import MobileTopHeader from "@/components/mobile/MobileTopHeader";
import { Loader2, ArrowLeft, X, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/use-toast";

export default function HomeRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Request.get(id)
      .then(setRequest)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const cancelRequest = async () => {
    const updated = await base44.entities.Request.update(id, { status: "cancelled" });
    setRequest(updated);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data } = await base44.functions.invoke("delete-request", { request_id: id });
      if (data?.error) throw new Error(data.error);
      navigate("/home/requests");
    } catch (err) {
      toast({ title: "Couldn't delete request", description: err.message, variant: "destructive" });
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!request) return <div className="p-8 text-center text-muted-foreground">Request not found</div>;

  const isOwner = request.homeowner_id === user.id;
  const canCancel = isOwner && request.status === "submitted";
  const canEdit = isOwner && !["approved", "resolved", "cancelled"].includes(request.status);
  const hasHoaAction = (request.activity_log || []).some((e) => ["status_change", "assigned", "unassigned", "note"].includes(e.type));
  const canDelete = isOwner && request.status === "submitted" && !hasHoaAction;

  return (
    <>
      <MobileTopHeader title={request.title} backTo="/home/requests" />
      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        <button onClick={() => navigate("/home/requests")} className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Requests
        </button>

        <div className="bg-card rounded-2xl warm-shadow p-5 sm:p-8 mb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h1 className="text-2xl font-bold">{request.title}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-muted-foreground mb-6 whitespace-pre-wrap">{request.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {request.request_type_name && <div><span className="text-muted-foreground">Type: </span><span className="font-medium">{request.request_type_name}</span></div>}
            <div><span className="text-muted-foreground">Category: </span><span className="font-medium capitalize">{(request.category || "").replace("_", " ")}</span></div>
            <div><span className="text-muted-foreground">Priority: </span><span className="font-medium capitalize">{request.priority}</span></div>
            <div><span className="text-muted-foreground">Submitted: </span><span className="font-medium">{formatDate(request.created_date)}</span></div>
            {request.contact_phone && <div><span className="text-muted-foreground">Phone: </span><span className="font-medium">{request.contact_phone}</span></div>}
            {request.contact_email && <div><span className="text-muted-foreground">Email: </span><span className="font-medium">{request.contact_email}</span></div>}
          </div>

          {request.custom_answers?.length > 0 && (
            <div className="mt-6 border-t border-border pt-4 grid sm:grid-cols-2 gap-3 text-sm">
              {request.custom_answers.map((a, i) => (
                <div key={i}><span className="text-muted-foreground">{a.label}: </span><span className="font-medium">{a.value}</span></div>
              ))}
            </div>
          )}

          {(request.start_date || request.end_date) && (
            <div className="mt-6 border-t border-border pt-4 grid sm:grid-cols-2 gap-3 text-sm">
              {request.start_date && <div><span className="text-muted-foreground">Start date: </span><span className="font-medium">{formatDate(request.start_date)}</span></div>}
              {request.end_date && <div><span className="text-muted-foreground">Completion date: </span><span className="font-medium">{formatDate(request.end_date)}</span></div>}
            </div>
          )}

          {request.status === "info_requested" && request.info_request && (() => {
            const infoEntry = (request.activity_log || []).slice().reverse().find((e) => e.type === "status_change" && e.status === "info_requested");
            return (
              <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-4">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">More information needed{infoEntry?.actor_name ? ` — requested by ${infoEntry.actor_name}` : ""}</p>
                <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{request.info_request}</p>
              </div>
            );
          })()}

          {request.status === "approved" && (
            <div className="mt-6 rounded-xl border border-green-300 bg-green-50 dark:bg-green-500/10 dark:border-green-500/30 p-4">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">This request has been approved{request.approved_by_name ? ` by ${request.approved_by_name}` : ""}.</p>
            </div>
          )}

          {request.assignee_type && request.assignee_type !== "none" && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground mb-2">Assigned to</p>
              {request.assignee_type === "staff" && (
                <p className="text-sm font-medium">{request.assigned_to_name || "Board member"}</p>
              )}
              {request.assignee_type === "vendor" && (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{request.assignee_info?.company}</p>
                  {request.assignee_info?.category && <p className="text-muted-foreground">Type of work: {request.assignee_info.category}</p>}
                  {request.assignee_info?.contact && <p className="text-muted-foreground">Contact: {request.assignee_info.contact}</p>}
                  {request.assignee_info?.details && <p className="text-muted-foreground whitespace-pre-wrap">{request.assignee_info.details}</p>}
                </div>
              )}
              {request.assignee_type === "other" && (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{request.assigned_to_name}</p>
                  {request.assignee_info?.details && <p className="text-muted-foreground whitespace-pre-wrap">{request.assignee_info.details}</p>}
                </div>
              )}
            </div>
          )}

          <RequestAttachments attachments={request.attachments} image_url={request.image_url} />

          {request.resolution_notes && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground mb-1">Resolution notes</p>
              <p className="text-sm whitespace-pre-wrap">{request.resolution_notes}</p>
            </div>
          )}
        </div>

        {user.board_member_status === "approved" && request.homeowner_id !== user.id && (
          <RequestManagePanel request={request} community={community} onUpdated={setRequest} />
        )}

        <div className="bg-card rounded-2xl warm-shadow p-5 sm:p-8 mb-6">
          <RequestProgress status={request.status} />
        </div>

        <RequestTimeline request={request} />

        {(canEdit || canCancel || canDelete) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {canEdit && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" /> {request.status === "info_requested" ? "Resubmit with Updates" : "Edit Request"}
              </Button>
            )}
            {canCancel && (
              <Button variant="outline" onClick={cancelRequest}>
                <X className="w-4 h-4 mr-2" /> Cancel Request
              </Button>
            )}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Request
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this request?</AlertDialogTitle>
                    <AlertDialogDescription>This permanently removes your request. This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}

        {canEdit && (
          <RequestEditDialog request={request} open={editOpen} onOpenChange={setEditOpen} onSaved={setRequest} />
        )}
      </div>
    </>
  );
}