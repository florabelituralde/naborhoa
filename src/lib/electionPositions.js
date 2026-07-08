// Standard HOA board positions, used as defaults when a community hasn't
// customized its own positions (stored as BoardPosition records).
export const DEFAULT_POSITIONS = [
  "President",
  "Vice President",
  "Treasurer",
  "Secretary",
];

// Legacy enum keys kept so historical records (stored as enum values) still
// render with friendly labels.
export const POSITIONS = [
  { value: "president", label: "President" },
  { value: "vice_president", label: "Vice President" },
  { value: "treasurer", label: "Treasurer" },
  { value: "secretary", label: "Secretary" },
];

export const POSITION_VALUES = POSITIONS.map(p => p.value);

export const positionLabel = (v) => {
  const found = POSITIONS.find(p => p.value === v);
  if (found) return found.label;
  return (v || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
};

// Order the position keys present in an election by the community's position
// list; any keys not in the community list (legacy/deleted positions) go last
// in their original order. When no community positions are provided, keys are
// returned in insertion order.
export const orderedPositionKeys = (byPosition, positions) => {
  const keys = Object.keys(byPosition);
  if (!positions || positions.length === 0) return keys;
  const ordered = [];
  const used = new Set();
  for (const p of positions) {
    const k = keys.find(x => x === p.name);
    if (k && !used.has(k)) { ordered.push(k); used.add(k); }
  }
  for (const k of keys) if (!used.has(k)) ordered.push(k);
  return ordered;
};