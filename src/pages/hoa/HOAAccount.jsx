import React from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Loader2, User as UserIcon, Mail } from "lucide-react";
import AccountDetailsSection from "@/components/hoa/AccountDetailsSection";
import PlanBillingSection from "@/components/hoa/PlanBillingSection";

export default function HOAAccount() {
  const { user, community } = useOutletContext();

  if (!community) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <PageHeader title="My Account" subtitle="Your profile, login, and subscription" />

      {/* Profile */}
      <div className="bg-card rounded-2xl warm-shadow p-6 mb-8 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
          {user?.full_name?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-lg truncate flex items-center gap-2"><UserIcon className="w-4 h-4 text-muted-foreground" />{user?.full_name}</p>
          <p className="text-sm text-muted-foreground truncate flex items-center gap-2"><Mail className="w-4 h-4" />{user?.email}</p>
        </div>
      </div>

      <div className="space-y-8">
        <AccountDetailsSection user={user} />
        <PlanBillingSection community={community} />
      </div>
    </div>
  );
}