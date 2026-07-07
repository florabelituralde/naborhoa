import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Loader2 } from "lucide-react";
import BoardRequestsSection from "@/components/board/BoardRequestsSection";
import BoardAnnouncementSection from "@/components/board/BoardAnnouncementSection";
import BoardEventSection from "@/components/board/BoardEventSection";
import BoardPollSection from "@/components/board/BoardPollSection";
import BoardElectionResultsSection from "@/components/board/BoardElectionResultsSection";
import BoardGallerySection from "@/components/board/BoardGallerySection";
import BoardCommunitySettingsSection from "@/components/board/BoardCommunitySettingsSection";
import BoardRequestsApprovalSection from "@/components/board/BoardRequestsApprovalSection";
import JoinRequestsSection from "@/components/JoinRequestsSection";

export default function HOABoardHub() {
  const { user, community, refreshCommunity } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [pollResults, setPollResults] = useState([]);
  const [electionResults, setElectionResults] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);

  const loadData = async () => {
    const [reqs, anns, evs, resultsRes, pendingRes] = await Promise.all([
      base44.entities.Request.filter({ community_id: community.id }, "-created_date", 50),
      base44.entities.Announcement.filter({ community_id: community.id }, "-created_date", 10),
      base44.entities.Event.filter({ community_id: community.id }, "start_time"),
      base44.functions.invoke("get-community-results", {}),
      base44.functions.invoke("get-board-access-requests", {}),
    ]);
    setRequests(reqs);
    setAnnouncements(anns);
    setEvents(evs);
    setPollResults(resultsRes?.data?.polls || []);
    setElectionResults(resultsRes?.data?.elections || []);
    setGallery(community.gallery || []);
    setPendingMembers(pendingRes?.data?.pendingMembers || []);
    setLoading(false);
  };

  useEffect(() => { if (community) loadData(); }, [community]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <PageHeader title="Board Hub" subtitle="Everything the board needs in one place" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JoinRequestsSection />
        <BoardRequestsApprovalSection community={community} pendingMembers={pendingMembers} onChange={loadData} />
        <BoardRequestsSection requests={requests} />
        <BoardAnnouncementSection community={community} user={user} announcements={announcements} onChange={loadData} />
        <BoardEventSection community={community} user={user} events={events} onChange={loadData} />
        <BoardPollSection community={community} user={user} pollResults={pollResults} votePath="/hoa/polls" onChange={loadData} />
        <BoardElectionResultsSection electionResults={electionResults} viewPath="/hoa/elections" />
      </div>

      <div className="mt-6 space-y-6">
        <BoardCommunitySettingsSection community={community} onSaved={refreshCommunity} />
        <BoardGallerySection community={community} gallery={gallery} onChange={(updated) => { setGallery(updated); refreshCommunity?.(); }} />
      </div>
    </div>
  );
}