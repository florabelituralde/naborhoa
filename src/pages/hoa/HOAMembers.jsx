import React from "react";
import PageHeader from "@/components/PageHeader";
import JoinRequestsSection from "@/components/JoinRequestsSection";

export default function HOAMembers() {
  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <PageHeader title="Membership Requests" subtitle="Review and approve homeowners requesting to join your community" />
      <JoinRequestsSection />
    </div>
  );
}