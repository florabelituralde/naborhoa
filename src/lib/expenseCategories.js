// Shared config for expense categories: labels + colors for badges and charts.
export const EXPENSE_CATEGORIES = [
  { value: "maintenance", label: "Maintenance", color: "#6a9078" },
  { value: "landscaping", label: "Landscaping", color: "#8bab78" },
  { value: "utilities", label: "Utilities", color: "#d1a054" },
  { value: "insurance", label: "Insurance", color: "#c17f59" },
  { value: "management", label: "Management", color: "#7b9bb3" },
  { value: "reserves", label: "Reserves", color: "#9b7fb3" },
  { value: "amenities", label: "Amenities", color: "#5a9ea0" },
  { value: "administrative", label: "Administrative", color: "#b3897b" },
  { value: "other", label: "Other", color: "#9c9488" },
];

export const getCategory = (value) =>
  EXPENSE_CATEGORIES.find((c) => c.value === value) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];