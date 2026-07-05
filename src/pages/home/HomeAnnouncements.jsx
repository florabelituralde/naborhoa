import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Loader2, Pin, Megaphone } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function HomeAnnouncements() {
  const { community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (!community) return;
    base44.entities.Announcement.filter({ community_id: community.id }, "-created_date").then(anns => {
      setAnnouncements(anns);
      setLoading(false);
    });
  }, [community]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const sorted = [...announcements].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title="Announcements" subtitle={`Updates from ${community?.name}`} />

      {sorted.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(ann => (
            <div key={ann.id} className="bg-card rounded-2xl warm-shadow p-6">
              <div className="flex items-center gap-2 mb-2">
                {ann.pinned && <Pin className="w-4 h-4 text-primary" />}
                <h3 className="font-semibold text-lg">{ann.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{formatDate(ann.created_date)}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{ann.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}