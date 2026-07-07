import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Camera, Loader2 } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

// Lets any user (homeowner or HOA admin) upload and update their profile photo.
// Saves to the user record via updateMe and refreshes the global auth user so
// avatars elsewhere (e.g. the sidebar) update immediately.
export default function ProfilePhotoUploader({ user, size = "w-16 h-16" }) {
  const { checkUserAuth } = useAuth();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(user?.photo_url || "");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ photo_url: file_url });
      setPhotoUrl(file_url);
      await checkUserAuth();
    } catch (err) {
      console.error("Profile photo upload failed:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="relative shrink-0">
      <UserAvatar user={{ ...user, photo_url: photoUrl }} className={size} textClass="text-xl font-bold" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-60"
        aria-label="Change profile photo"
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}