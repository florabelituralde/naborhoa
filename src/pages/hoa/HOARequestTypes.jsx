import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, Sparkles, LibraryBig, BookmarkPlus } from "lucide-react";
import { getRequestTypeIcon } from "@/lib/requestTypeIcon";
import { DEFAULT_REQUEST_TYPES } from "@/lib/defaultRequestTypes";
import RequestTypeEditor from "@/components/hoa/RequestTypeEditor";
import TemplateLibraryDialog from "@/components/hoa/TemplateLibraryDialog";

export default function HOARequestTypes() {
  const { community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [savingTemplateId, setSavingTemplateId] = useState(null);

  const load = () => {
    return base44.entities.RequestType.filter({ community_id: community.id }, "sort_order").then(setTypes);
  };

  useEffect(() => {
    if (!community) return;
    load().then(() => setLoading(false));
  }, [community]);

  const seedDefaults = async () => {
    setSeeding(true);
    await base44.entities.RequestType.bulkCreate(
      DEFAULT_REQUEST_TYPES.map((t, i) => ({ ...t, community_id: community.id, active: true, sort_order: i }))
    );
    await load();
    setSeeding(false);
  };

  const handleSave = async (form) => {
    if (form.id) {
      await base44.entities.RequestType.update(form.id, form);
    } else {
      await base44.entities.RequestType.create({ ...form, community_id: community.id, sort_order: types.length });
    }
    await load();
  };

  const TEMPLATE_FIELDS = ["name", "description", "icon", "category", "requires_attachment", "attachment_label", "custom_fields"];

  const saveAsTemplate = async (t) => {
    setSavingTemplateId(t.id);
    const data = { community_id: community.id };
    TEMPLATE_FIELDS.forEach((k) => { if (t[k] !== undefined) data[k] = t[k]; });
    await base44.entities.RequestTypeTemplate.create(data);
    setSavingTemplateId(null);
  };

  const deployTemplate = async (tpl) => {
    await base44.entities.RequestType.create({ ...tpl, community_id: community.id, active: true, sort_order: types.length });
    await load();
  };

  const toggleActive = async (t) => {
    await base44.entities.RequestType.update(t.id, { active: !t.active });
    await load();
  };

  const remove = async (t) => {
    if (!confirm(`Delete "${t.name}"? Residents will no longer be able to select it.`)) return;
    await base44.entities.RequestType.delete(t.id);
    await load();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Request Types"
        subtitle="Control which requests residents can submit and what info they must provide"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLibraryOpen(true)}><LibraryBig className="w-4 h-4 mr-2" /> Templates</Button>
            <Button onClick={() => { setEditing(null); setEditorOpen(true); }}><Plus className="w-4 h-4 mr-2" /> New Type</Button>
          </div>
        }
      />

      {types.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">Set up your request catalog</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Start with a ready-made set of common HOA request types (fences, sheds, pools, street lights, and more) — then customize freely.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={seedDefaults} disabled={seeding}>
              {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Add common HOA request types
            </Button>
            <Button variant="outline" onClick={() => { setEditing(null); setEditorOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Create from scratch
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {types.map(t => {
            const Icon = getRequestTypeIcon(t.icon);
            return (
              <div key={t.id} className={`bg-card rounded-2xl warm-shadow p-4 flex items-center gap-4 ${!t.active ? "opacity-60" : ""}`}>
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{t.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{t.category.replace("_", " ")}</span>
                    {t.requires_attachment && <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">Attachment required</span>}
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground truncate mt-0.5">{t.description}</p>}
                  {t.custom_fields?.length > 0 && <p className="text-xs text-muted-foreground mt-1">{t.custom_fields.length} custom field{t.custom_fields.length > 1 ? "s" : ""}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={t.active} onCheckedChange={() => toggleActive(t)} />
                  <Button variant="ghost" size="icon" title="Save as template" onClick={() => saveAsTemplate(t)} disabled={savingTemplateId === t.id}>
                    {savingTemplateId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setEditorOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(t)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RequestTypeEditor open={editorOpen} onOpenChange={setEditorOpen} initial={editing} onSave={handleSave} />
      <TemplateLibraryDialog open={libraryOpen} onOpenChange={setLibraryOpen} community={community} onDeploy={deployTemplate} />
    </div>
  );
}