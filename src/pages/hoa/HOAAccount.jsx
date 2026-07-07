import React from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Loader2, User as UserIcon, Mail } from "lucide-react";
import AccountDetailsSection from "@/components/hoa/AccountDetailsSection";
import ProfilePhotoUploader from "@/components/ProfilePhotoUploader";
import PlanBillingSection from "@/components/hoa/PlanBillingSection";
import LegalLinks from "@/components/LegalLinks";

export default function HOAAccount() {
  const { user, community } = useOutletContext();

  // Render the page as soon as we have the user. The plan/billing section
  // depends on the community record, so it is gated separately — without this,
  // a failed community fetch left the whole page stuck on a spinner (blank).
  if (!user) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <PageHeader title="My Account" subtitle="Your profile, login, and subscription" />

      {/* Profile */}
      <div className="bg-card rounded-2xl warm-shadow p-6 mb-8 flex items-center gap-4">
        <ProfilePhotoUploader user={user} size="w-14 h-14" />
        <div className="min-w-0">
          <p className="font-semibold text-lg truncate flex items-center gap-2"><UserIcon className="w-4 h-4 text-muted-foreground" />{user?.full_name}</p>
          <p className="text-sm text-muted-foreground truncate flex items-center gap-2"><Mail className="w-4 h-4" />{user?.email}</p>
        </div>
      </div>

      <div className="space-y-8">
        <AccountDetailsSection user={user} />
        {community ? (
          <PlanBillingSection community={community} />
        ) : (
          <div className="bg-card rounded-2xl warm-shadow p-6">
            <h2 className="font-semibold text-lg mb-2">Subscription &amp; Plan</h2>
            <p className="text-sm text-muted-foreground">Loading your subscription details…</p>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-border">
        <LegalLinks />
      </div>
    </div>
  );
}