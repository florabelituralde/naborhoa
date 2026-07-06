import React, { useState, useEffect } from "react";
import { useOutletContext, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Loader2 } from "lucide-react";
import BoardRequestsSection from "@/components/board/BoardRequestsSection";
import BoardAnnouncementSection from "@/components/board/BoardAnnouncementSection";
import BoardEventSection from "@/components/board/BoardEventSection";
import BoardPollResultsSection from "@/components/board/BoardPollResultsSection";
import BoardGallerySection from "@/components/board/BoardGallerySection";
import JoinRequestsSection from "@/components/JoinRequestsSection";

export default function HomeBoardHub() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [polls, setPolls] = useState([]);
  const [votes, setVotes] = useState([]);
  const [gallery, setGallery] = useState([]);

  const loadData = async () => {
    const [reqs, anns, evs, p, v] = await Promise.all([
      base44.entities.Request.filter({ community_id: community.id }, "-created_date", 50),
      base44.entities.Announcement.filter({ community_id: community.id }, "-created_date", 10),
      base44.entities.Event.filter({ community_id: community.id }, "start_time"),
      base44.entities.Poll.filter({ community_id: community.id }, "-created_date"),
      base44.entities.PollVote.filter({}),
    ]);
    setRequests(reqs);
    setAnnouncements(anns);
    setEvents(evs);
    setPolls(p);
    setVotes(v);
    setGallery(community.gallery || []);
    setLoading(false);
  };

  useEffect(() => { if (community) loadData(); }, [community]);

  if (user.board_member_status !== "approved") return <Navigate to="/home/dashboard" replace />;

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <PageHeader title="Board Hub" subtitle="Manage community requests, announcements, events, and more" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JoinRequestsSection />
        <BoardRequestsSection requests={requests} viewAllPath="/home/requests" detailBasePath="/home/requests" />
        <BoardAnnouncementSection community={community} user={user} announcements={announcements} onChange={loadData} />
        <BoardEventSection community={community} user={user} events={events} onChange={loadData} />
        <BoardPollResultsSection polls={polls} votes={votes} managePath="/home/polls" />
      </div>

      <div className="mt-6">
        <BoardGallerySection community={community} gallery={gallery} onChange={setGallery} />
      </div>
    </div>
  );
}