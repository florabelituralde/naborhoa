export const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

export const formatCurrency = (amount) =>
  `$${(Number(amount) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";

export const titleCase = (str) =>
  (str || "").replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());