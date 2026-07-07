import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Loader2, Contact, Mail } from "lucide-react";
import { formatDate } from "@/lib/format";
import { positionLabel } from "@/lib/electionPositions";
import { useCommunityPositions } from "@/hooks/useCommunityPositions";

export default function HomeBoard() {
  const { community } = useOutletContext();
  const { positions } = useCommunityPositions(community);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!community) {
      setLoading(false);
      return;
    }
    setLoading(true);
    base44.entities.BoardMember.filter({ community_id: community.id })
      .then(mems => setMembers(mems))
      .finally(() => setLoading(false));
  }, [community]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const roleIndex = (r) => {
    const i = positions.findIndex(p => p.name === r);
    return i === -1 ? 9999 : i;
  };
  const sorted = [...members].filter(m => !m.outgoing).sort((a, b) => roleIndex(a.role) - roleIndex(b.role));

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader title="Board Members" subtitle={`Your HOA leadership team at ${community?.name}`} />

      {sorted.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Contact className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No board members listed yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sorted.map(m => (
            <div key={m.id} className="bg-card rounded-2xl warm-shadow p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                  {m.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold">{m.name}</h3>
                  <p className="text-xs text-primary font-medium">{positionLabel(m.role)}</p>
                </div>
              </div>
              {m.bio && <p className="text-sm text-muted-foreground mt-3">{m.bio}</p>}
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {m.email && <p className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {m.email}</p>}
                {(m.term_start || m.term_end) && (
                  <p>Term: {m.term_start ? formatDate(m.term_start) : "—"} to {m.term_end ? formatDate(m.term_end) : "—"}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}