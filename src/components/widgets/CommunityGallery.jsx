import React, { useState } from "react";
import { Images, X, ChevronLeft, ChevronRight } from "lucide-react";

// Displays the community's photo gallery for homeowners, with a lightbox viewer.
export default function CommunityGallery({ community }) {
  const gallery = community?.gallery || [];
  const [active, setActive] = useState(null); // index of open image

  if (gallery.length === 0) return null;

  const show = (i) => setActive(i);
  const close = () => setActive(null);
  const prev = (e) => { e.stopPropagation(); setActive((a) => (a - 1 + gallery.length) % gallery.length); };
  const next = (e) => { e.stopPropagation(); setActive((a) => (a + 1) % gallery.length); };

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
        <Images className="w-5 h-5 text-primary" /> Community Gallery
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {gallery.map((url, i) => (
          <button
            key={url}
            onClick={() => show(i)}
            className="aspect-square rounded-xl overflow-hidden border border-border group"
          >
            <img
              src={url}
              alt={`${community.name} photo ${i + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </button>
        ))}
      </div>

      {active !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={close}
        >
          <button onClick={close} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
          {gallery.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={next} className="absolute right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img
            src={gallery[active]}
            alt={`${community.name} photo ${active + 1}`}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}