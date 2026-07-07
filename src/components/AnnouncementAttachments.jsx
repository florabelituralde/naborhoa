import React from "react";
import { FileText } from "lucide-react";

const isImage = (url = "") => /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/i.test(url);

// Renders an announcement's attached photos and files. Images open in a new tab.
export default function AnnouncementAttachments({ attachments = [] }) {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => isImage(a.url));
  const files = attachments.filter((a) => !isImage(a.url));

  return (
    <div className="mt-3 space-y-2">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img, i) => (
            <a
              key={i}
              href={img.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg overflow-hidden border border-border"
            >
              <img src={img.url} alt={img.name || ""} className="w-full h-28 object-cover" />
            </a>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <a
              key={i}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
            >
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate flex-1">{f.name || "Attachment"}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}