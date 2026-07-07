import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, Check, Image as ImageIcon } from "lucide-react";

// Lets approved board members (and HOA admins) edit community appearance:
// name, description, location, and banner photo. Gallery is managed in
// the dedicated BoardGallerySection — this section handles the rest.
export default function BoardCommunitySettingsSection({ community, onSaved }) {
  const { toast } = useToast();
  const [name, setName] = useState(community.name || "");
  const [description, setDescription] = useState(community.description || "");
  const [city, setCity] = useState(community.city || "");
  const [stateVal, setStateVal] = useState(community.state || "");
  const [zip, setZip] = useState(community.zip || "");
  const [bannerFile, setBannerFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const bannerRef = useRef(null);

  const save = async () => {
    setSaving(true);
    try {
      const update = {
        name: name.trim(),
        description: description.trim(),
        city: city.trim(),
        state: stateVal.trim(),
        zip: zip.trim(),
      };
      if (bannerFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: bannerFile });
        update.photo_url = file_url;
      }
      await base44.entities.Community.update(community.id, update);
      setBannerFile(null);
      toast({ title: "Community updated" });
      onSaved?.();
    } catch (err) {
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
        <ImageIcon className="w-5 h-5 text-primary" /> Community Settings
      </h2>
      <div className="space-y-4">
        <div>
          <Label>Community Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" rows={2} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>State</Label>
            <Input value={stateVal} onChange={(e) => setStateVal(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>ZIP</Label>
            <Input value={zip} onChange={(e) => setZip(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <div>
          <Label>Banner Photo</Label>
          <div
            onClick={() => bannerRef.current?.click()}
            className="mt-1.5 border-2 border-dashed border-border rounded-xl p-3 text-center cursor-pointer hover:border-primary transition-colors"
          >
            {bannerFile ? (
              <p className="text-sm font-medium">{bannerFile.name}</p>
            ) : community.photo_url ? (
              <img src={community.photo_url} alt="Banner" className="w-full h-20 object-cover rounded-lg" />
            ) : (
              <div className="h-20 flex items-center justify-center">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => setBannerFile(e.target.files[0])} />
        </div>
        <Button onClick={save} disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}