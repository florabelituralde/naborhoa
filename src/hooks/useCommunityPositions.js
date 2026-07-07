import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DEFAULT_POSITIONS } from "@/lib/electionPositions";

// Loads a community's custom board positions, falling back to the app default
// positions when none have been defined yet.
export function useCommunityPositions(community) {
  const [positions, setPositions] = useState([]);
  const [customized, setCustomized] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!community?.id) { setLoading(false); return; }
    try {
      const recs = await base44.entities.BoardPosition.filter({ community_id: community.id });
      recs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      if (recs.length > 0) {
        setPositions(recs.map(r => ({ id: r.id, name: r.name, sort_order: r.sort_order || 0 })));
        setCustomized(true);
      } else {
        setPositions(DEFAULT_POSITIONS.map((name, i) => ({ name, sort_order: i })));
        setCustomized(false);
      }
    } catch {
      setPositions(DEFAULT_POSITIONS.map((name, i) => ({ name, sort_order: i })));
      setCustomized(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [community?.id]);
  return { positions, customized, loading, reload: load };
}