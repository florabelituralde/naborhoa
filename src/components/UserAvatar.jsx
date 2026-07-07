import React from "react";
import { cn } from "@/lib/utils";

// Displays a user's profile photo when available, otherwise their initials.
export default function UserAvatar({ user, className, textClass }) {
  if (user?.photo_url) {
    return (
      <img
        src={user.photo_url}
        alt={user?.full_name || "Profile"}
        className={cn("rounded-full object-cover shrink-0", className)}
      />
    );
  }
  const initials = (user?.full_name || "")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <div className={cn("rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0", className, textClass)}>
      {initials}
    </div>
  );
}