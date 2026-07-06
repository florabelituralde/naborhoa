import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Upload, FileText, X, ChevronRight } from "lucide-react";
import { getRequestTypeIcon } from "@/lib/requestTypeIcon";

export default function HomeNewRequest() {
  const navigate = useNavigate();
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);

  const [form, setForm] = useState({ title: "", description: "", priority: "medium", contact_phone: "", contact_email: "" });
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!community) return;
    base44.entities.RequestType.filter({ community_id: community.id, active: true }, "sort_order")
      .then(t => { setTypes(t); })
      .catch(() => { setTypes([]); })
      .finally(() => setLoading(false));
  }, [community]);

  const selectType = (t) => {
    setSelectedType(t);
    setForm(f => ({ ...f, title: "", contact_email: user?.email || "" }));
    setAnswers({});
    setFiles([]);
  };

  const addFiles = (fileList) => {
    setFiles(prev => [...prev, ...Array.from(fileList)]);
  };

  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const requiredMissing = () => {
    if (!form.title.trim() || !form.description.trim()) return true;
    if (selectedType?.requires_attachment && files.length === 0) return true;
    for (const field of selectedType?.custom_fields || []) {
      if (field.required && !answers[field.label]?.trim()) return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const uploaded = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({ name: file.name, url: result.file_url });
      }

      await base44.entities.Request.create({
        community_id: community.id,
        homeowner_id: user.id,
        property_id: user.property_id,
        request_type_id: selectedType.id,
        request_type_name: selectedType.name,
        category: selectedType.category,
        title: form.title,
        description: form.description,
        priority: form.priority,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        attachments: uploaded,
        image_url: uploaded[0]?.url || null,
        custom_answers: (selectedType.custom_fields || [])
          .filter(f => answers[f.label])
          .map(f => ({ label: f.label, value: answers[f.label] })),
        status: "submitted",
      });
      navigate("/home/requests");
    } catch (err) {
      setSubmitError(err?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <button
        onClick={() => selectedType ? setSelectedType(null) : navigate("/home/requests")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> {selectedType ? "Choose a different type" : "Back to Requests"}
      </button>

      {!selectedType ? (
        <>
          <PageHeader title="New Request" subtitle="Choose the type of request you'd like to submit" />
          {types.length === 0 ? (
            <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
              <p className="text-muted-foreground">No request types are available yet. Please reach out to your HOA admins to enable requests for your community.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {types.map(t => {
                const Icon = getRequestTypeIcon(t.icon);
                return (
                  <button
                    key={t.id}
                    onClick={() => selectType(t)}
                    className="bg-card rounded-2xl warm-shadow p-5 text-left hover:warm-shadow-md hover:border-primary border border-transparent transition-all flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{t.name}</h3>
                      {t.description && <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <PageHeader title={selectedType.name} subtitle={selectedType.description} />
          <div className="bg-card rounded-2xl warm-shadow p-5 sm:p-8">
            <div className="space-y-5">
              <div>
                <Label>Title <span className="text-destructive">*</span></Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1.5 h-11" placeholder="Brief summary" />
              </div>
              <div>
                <Label>Description <span className="text-destructive">*</span></Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={4} placeholder="Describe your request in detail..." />
              </div>

              {/* Custom fields for this request type */}
              {(selectedType.custom_fields || []).map((field, i) => (
                <div key={i}>
                  <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                  {field.type === "textarea" ? (
                    <Textarea value={answers[field.label] || ""} onChange={e => setAnswers({ ...answers, [field.label]: e.target.value })} className="mt-1.5" rows={3} />
                  ) : field.type === "select" ? (
                    <Select value={answers[field.label] || ""} onValueChange={v => setAnswers({ ...answers, [field.label]: v })}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {(field.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type === "number" ? "number" : "text"}
                      value={answers[field.label] || ""}
                      onChange={e => setAnswers({ ...answers, [field.label]: e.target.value })}
                      className="mt-1.5 h-11"
                    />
                  )}
                </div>
              ))}

              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Contact info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Contact phone</Label>
                  <Input type="tel" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} className="mt-1.5 h-11" placeholder="(555) 123-4567" />
                </div>
                <div>
                  <Label>Contact email</Label>
                  <Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className="mt-1.5 h-11" placeholder="you@email.com" />
                </div>
              </div>

              {/* Attachments */}
              <div>
                <Label>
                  {selectedType.attachment_label || "Attachments"}
                  {selectedType.requires_attachment && <span className="text-destructive"> *</span>}
                </Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1.5 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload photos or files</p>
                </div>
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={e => addFiles(e.target.files)} />
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm truncate flex-1">{f.name}</span>
                        <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {submitError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  {submitError}
                </div>
              )}
              <Button onClick={handleSubmit} disabled={requiredMissing() || submitting} className="w-full h-12">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit Request
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}