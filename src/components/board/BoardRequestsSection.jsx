import React from "react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/StatusBadge";
import { ClipboardList } from "lucide-react";

export default function BoardRequestsSection({ requests, viewAllPath = "/hoa/requests", detailBasePath = "/hoa/requests" }) {
  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Recent Requests
        </h2>
        <Link to={viewAllPath} className="text-sm text-primary font-medium hover:underline">View all</Link>
      </div>
      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No requests yet</p>
      ) : (
        <div className="space-y-2">
          {requests.slice(0, 6).map(req => (
            <Link key={req.id} to={`${detailBasePath}/${req.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{req.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{req.category}</p>
              </div>
              <StatusBadge status={req.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}