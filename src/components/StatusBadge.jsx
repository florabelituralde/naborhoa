import React from "react";

const STATUS_STYLES = {
  submitted: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  resolved: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  pending: "bg-amber-50 text-amber-700",
  paid: "bg-blue-50 text-blue-700",
  confirmed: "bg-green-50 text-green-700",
  overdue: "bg-red-50 text-red-700",
  active: "bg-green-50 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-600";
  const label = (status || "").replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}