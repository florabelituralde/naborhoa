import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function RoleRouter() {
  const [redirect, setRedirect] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(user => {
      const role = user.role ?? user.data?.role;
      const communityId = user.community_id ?? user.data?.community_id;
      if (role === "hoa_admin" || role === "hoa_staff") {
        setRedirect(communityId ? "/hoa/dashboard" : "/onboarding");
      } else if (role === "homeowner") {
        setRedirect(communityId ? "/home/dashboard" : "/join");
      } else {
        setRedirect("/choose-role");
      }
      setLoading(false);
    }).catch(() => {
      setRedirect("/login");
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  return <Navigate to={redirect} replace />;
}