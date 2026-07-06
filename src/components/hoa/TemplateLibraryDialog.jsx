import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, LibraryBig, Rocket, Trash2, BookmarkPlus } from "lucide-react";
import { getRequestTypeIcon } from "@/lib/requestTypeIcon";

// Fields copied when saving a request type as a template or deploying one.
const TEMPLATE_FIELDS = ["name", "description", "icon", "category", "requires_attachment", "attachment_label", "custom_fields"];

function pick(obj) {
  const out = {};
  TEMPLATE_FIELDS.forEach((k) => { if (obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}

// Library of saved request-type templates. Managers can deploy a template as a
// new request type, or delete templates they no longer need.
export default function TemplateLibraryDialog({ open, onOpenChange, community, onDeploy }) {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    base44.entities.RequestTypeTemplate.filter({ community_id: community.id }, "-created_date").then(setTemplates);

  useEffect(() => {
    if (!open || !community) return;
    setLoading(true);
    load().then(() => setLoading(false));
  }, [open, community]);

  const deploy = async (tpl) => {
    setBusyId(tpl.id);
    await onDeploy(pick(tpl));
    setBusyId(null);
    onOpenChange(false);
  };

  const remove = async (tpl) => {
    if (!confirm(`Delete the "${tpl.name}" template? This won't affect request types already in use.`)) return;
    setBusyId(tpl.id);
    await base44.entities.RequestTypeTemplate.delete(tpl.id);
    await load();
    setBusyId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LibraryBig className="w-5 h-5 text-primary" /> Template Library</DialogTitle>
          <DialogDescription>Deploy a saved template as a new request type for common tasks like landscaping or fence modifications.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : templates.length === 0 ? (
          <div className="py-10 text-center">
            <BookmarkPlus className="w-9 h-9 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">No saved templates yet. Use "Save as template" on any request type to build your library.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[55vh] overflow-y-auto -mx-1 px-1">
            {templates.map((tpl) => {
              const Icon = getRequestTypeIcon(tpl.icon);
              const busy = busyId === tpl.id;
              return (
                <div key={tpl.id} className="bg-muted/40 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm truncate">{tpl.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-background text-muted-foreground capitalize">{tpl.category.replace("_", " ")}</span>
                    </div>
                    {tpl.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{tpl.description}</p>}
                    {tpl.custom_fields?.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">{tpl.custom_fields.length} field{tpl.custom_fields.length > 1 ? "s" : ""}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" onClick={() => deploy(tpl)} disabled={busy}>
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Rocket className="w-4 h-4 mr-1.5" /> Deploy</>}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(tpl)} disabled={busy}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}