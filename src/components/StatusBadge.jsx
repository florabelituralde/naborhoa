import React from "react";

const STATUS_STYLES = {
  submitted: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  in_progress: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  resolved: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-500/15 dark:text-gray-400",
  approved: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  info_requested: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  paid: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  confirmed: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  overdue: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  active: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  closed: "bg-gray-100 text-gray-500 dark:bg-gray-500/15 dark:text-gray-400",
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400";
  const label = (status || "").replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}