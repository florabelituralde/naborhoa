import React, { useState, useEffect, useCallback } from "react";
import { Images, ChevronLeft, ChevronRight } from "lucide-react";

// Auto-sliding photo gallery for the community view.
export default function GallerySlideshow({ community, interval = 4500 }) {
  const gallery = community?.gallery || [];
  const [index, setIndex] = useState(0);

  const go = useCallback((next) => {
    setIndex((i) => (i + next + gallery.length) % gallery.length);
  }, [gallery.length]);

  useEffect(() => {
    if (gallery.length <= 1) return;
    const t = setInterval(() => go(1), interval);
    return () => clearInterval(t);
  }, [gallery.length, interval, go]);

  if (gallery.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
        <Images className="w-5 h-5 text-primary" /> Community Gallery
      </h2>
      <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-muted group">
        {gallery.map((url, i) => (
          <img
            key={url}
            src={url}
            alt={`${community.name} photo ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}
          />
        ))}

        {gallery.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {gallery.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
                  aria-label={`Go to photo ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}