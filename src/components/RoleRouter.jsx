import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function RoleRouter() {
  const [redirect, setRedirect] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(user => {
      if (!user.role) {
        setRedirect("/choose-role");
      } else if (user.role === "hoa_admin" || user.role === "hoa_staff") {
        setRedirect(user.community_id ? "/hoa/dashboard" : "/onboarding");
      } else if (user.role === "homeowner") {
        setRedirect(user.community_id ? "/home/dashboard" : "/join");
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