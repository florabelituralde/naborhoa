import React from "react";
import { useOutletContext, Link } from "react-router-dom";
import { hasModule } from "@/lib/planAccess";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

// Wraps a page and blocks access if the community's plan doesn't include `module`.
// `homePath` is where the "Go back" button sends the user.
export default function PlanGate({ module, homePath, children }) {
  const ctx = useOutletContext();
  const community = ctx?.community;

  if (hasModule(community, module)) {
    return children;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">Not available on this plan</h2>
        <p className="text-muted-foreground mb-6">
          This feature isn't included in your community's current plan. Your HOA
          manager can upgrade the plan to unlock it.
        </p>
        <Button asChild variant="outline">
          <Link to={homePath}>Go back</Link>
        </Button>
      </div>
    </div>
  );
}