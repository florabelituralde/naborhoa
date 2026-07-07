import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

export default function RoleRouter() {
  const { user } = useAuth();
  const [redirect, setRedirect] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reuse the session AuthProvider already validated instead of a second /me
  // call, which can stall and leave the router on the spinner.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const role = user.role;
      const communityId = user.community_id;
      if (role === "hoa_admin" || role === "hoa_staff") {
        setRedirect(communityId ? "/hoa/dashboard" : "/onboarding");
      } else if (role === "homeowner") {
        if (communityId) {
          setRedirect("/home/dashboard");
        } else {
          try {
            const pending = await base44.entities.JoinRequest.filter({ homeowner_id: user.id }, "-created_date", 1);
            if (!active) return;
            setRedirect(pending.length > 0 && pending[0].status !== "approved" ? "/pending-approval" : "/join");
          } catch {
            setRedirect("/join");
          }
        }
      } else {
        setRedirect("/choose-role");
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  return <Navigate to={redirect} replace />;
}