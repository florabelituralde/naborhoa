import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Loader2, ImagePlus, X } from "lucide-react";

// Step for uploading a cover photo, a logo, and gallery images for the community.
export default function CommunityPhotosStep({ value, onChange, onNext, onBack }) {
  const [uploading, setUploading] = useState(null); // "photo" | "logo" | "gallery" | null

  const uploadOne = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  const handleSingle = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(field);
    try {
      const url = await uploadOne(file);
      onChange({ ...value, [field]: url });
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  const handleGallery = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading("gallery");
    try {
      const urls = await Promise.all(files.map(uploadOne));
      onChange({ ...value, gallery: [...(value.gallery || []), ...urls] });
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  const removeGallery = (url) => {
    onChange({ ...value, gallery: (value.gallery || []).filter((g) => g !== url) });
  };

  return (
    <div className="bg-card rounded-2xl warm-shadow-md p-8">
      <h2 className="text-2xl font-bold mb-1">Add community photos</h2>
      <p className="text-muted-foreground mb-6">Help residents recognize their community. All photos are optional.</p>

      <div className="space-y-6">
        {/* Cover photo */}
        <div>
          <Label>Cover photo</Label>
          <div className="mt-2">
            {value.photo_url ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={value.photo_url} alt="Cover" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => onChange({ ...value, photo_url: "" })}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 h-40 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors">
                {uploading === "photo" ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <>
                    <ImagePlus className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload cover photo</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSingle("photo_url", e)} />
              </label>
            )}
          </div>
        </div>

        {/* Gallery */}
        <div>
          <Label>Gallery</Label>
          <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-3">
            {(value.gallery || []).map((url) => (
              <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeGallery(url)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors">
              {uploading === "gallery" ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
              )}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleGallery} />
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="h-12">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button type="button" onClick={onNext} disabled={!!uploading} className="flex-1 h-12">
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}