import React, { useState, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Upload, Image } from "lucide-react";

export default function HomeNewRequest() {
  const navigate = useNavigate();
  const { user, community } = useOutletContext();
  const [form, setForm] = useState({ title: "", description: "", category: "maintenance", priority: "medium" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    let imageUrl = null;
    if (selectedFile) {
      const result = await base44.integrations.Core.UploadFile({ file: selectedFile });
      imageUrl = result.file_url;
    }
    await base44.entities.Request.create({
      ...form,
      community_id: community.id,
      homeowner_id: user.id,
      property_id: user.property_id,
      image_url: imageUrl,
      status: "submitted",
    });
    navigate("/home/requests");
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button onClick={() => navigate("/home/requests")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Requests
      </button>

      <PageHeader title="New Request" subtitle="Submit a maintenance, repair, or plan review request" />

      <div className="bg-card rounded-2xl warm-shadow p-8">
        <div className="space-y-5">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1.5 h-11" placeholder="Leaky kitchen faucet" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={4} placeholder="Describe the issue in detail..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="plan_review">Plan Review</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>
          <div>
            <Label>Photo (optional)</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload a photo</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => setSelectedFile(e.target.files[0])} />
          </div>
          <Button onClick={handleSubmit} disabled={!form.title || !form.description || submitting} className="w-full h-12">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}