export const POSITIONS = [
  { value: "president", label: "President" },
  { value: "vice_president", label: "Vice President" },
  { value: "treasurer", label: "Treasurer" },
  { value: "secretary", label: "Secretary" },
  { value: "member_at_large", label: "Member at Large" },
];

export const POSITION_VALUES = POSITIONS.map(p => p.value);

export const positionLabel = (v) => {
  const found = POSITIONS.find(p => p.value === v);
  if (found) return found.label;
  return (v || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
};