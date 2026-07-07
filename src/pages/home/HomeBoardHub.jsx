import React, { useState, useEffect } from "react";
import { useOutletContext, Navigate } from "react-router-dom";
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
import JoinRequestsSection from "@/components/JoinRequestsSection";
import ShareLinksPanel from "@/components/hoa/ShareLinksPanel";

export default function HomeBoardHub() {
  const { user, community, refreshCommunity } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [pollResults, setPollResults] = useState([]);
  const [electionResults, setElectionResults] = useState([]);
  const [gallery, setGallery] = useState([]);

  const loadData = async () => {
    try {
      const [reqs, anns, evs, resultsRes] = await Promise.all([
        base44.entities.Request.filter({ community_id: community.id }, "-created_date", 50),
        base44.entities.Announcement.filter({ community_id: community.id }, "-created_date", 10),
        base44.entities.Event.filter({ community_id: community.id }, "start_time"),
        base44.functions.invoke("get-community-results", {}),
      ]);
      setRequests(reqs || []);
      setAnnouncements(anns || []);
      setEvents(evs || []);
      setPollResults(resultsRes?.data?.polls || []);
      setElectionResults(resultsRes?.data?.elections || []);
      setGallery(community.gallery || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (community) loadData(); else setLoading(false); }, [community]);

  if (user.board_member_status !== "approved") return <Navigate to="/home/dashboard" replace />;

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <PageHeader title="Board Hub" subtitle="Manage community requests, announcements, events, and more" />

      <ShareLinksPanel community={community} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JoinRequestsSection />
        <BoardRequestsSection requests={requests} viewAllPath="/home/requests" detailBasePath="/home/requests" />
        <BoardAnnouncementSection community={community} user={user} announcements={announcements} onChange={loadData} />
        <BoardEventSection community={community} user={user} events={events} onChange={loadData} />
        <BoardPollSection community={community} user={user} pollResults={pollResults} votePath="/home/polls" onChange={loadData} />
        <BoardElectionResultsSection electionResults={electionResults} viewPath="/home/elections" />
      </div>

      <div className="mt-6 space-y-6">
        <BoardCommunitySettingsSection community={community} onSaved={refreshCommunity} />
        <BoardGallerySection community={community} gallery={gallery} onChange={(updated) => { setGallery(updated); refreshCommunity?.(); }} />
      </div>
    </div>
  );
}