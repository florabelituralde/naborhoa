import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { friendlyAuthError } from "@/lib/authErrors";
import { Building2, Home, Loader2 } from "lucide-react";

export default function ChooseRole() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reuse the session the AuthProvider already validated instead of making a
  // second /me call, which can stall and leave the page on the spinner.
  useEffect(() => {
    if (!user) return;
    if (user.role === "hoa_admin") navigate(user.community_id ? "/hoa/dashboard" : "/onboarding", { replace: true });
    else if (user.role === "homeowner") navigate(user.community_id ? "/home/dashboard" : "/join", { replace: true });
  }, [user, navigate]);

  const chooseRole = async (role) => {
    setError("");
    setSubmitting(true);
    try {
      await base44.auth.updateMe({ role });
      window.location.href = role === "hoa_admin" ? "/onboarding" : "/join";
    } catch (err) {
      setError(friendlyAuthError(err, "We couldn't save your choice. Please try again."));
      setSubmitting(false);
    }
  };

  if (!user || submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>
        )}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Home className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Nabor</h1>
          <p className="text-muted-foreground mt-2">Tell us how you'll use the platform</p>
        </div>
        <div className="space-y-4">
          <button
            onClick={() => chooseRole("homeowner")}
            className="w-full flex items-center gap-4 p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">I'm a Homeowner</h3>
              <p className="text-sm text-muted-foreground">Submit requests, pay bills, and get AI answers</p>
            </div>
          </button>
          <button
            onClick={() => chooseRole("hoa_admin")}
            className="w-full flex items-center gap-4 p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">I'm an HOA Manager</h3>
              <p className="text-sm text-muted-foreground">Manage communities, requests, and billing</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}