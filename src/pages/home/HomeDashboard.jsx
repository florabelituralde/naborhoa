import React, { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/StatusBadge";
import { Vote, Loader2, UserCircle, Calendar as CalendarIcon, Megaphone, Contact } from "lucide-react";
import { formatDate } from "@/lib/format";
import AnnouncementsWidget from "@/components/widgets/AnnouncementsWidget";
import AIChatWidget from "@/components/widgets/AIChatWidget";
import CommunityCalendar from "@/components/widgets/CommunityCalendar";
import GallerySlideshow from "@/components/widgets/GallerySlideshow";

export default function HomeDashboard() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!community) return;
    Promise.all([
      base44.entities.Poll.filter({ community_id: community.id, status: "active" }, "-created_date", 3),
      base44.entities.Announcement.filter({ community_id: community.id }, "-created_date", 3),
      base44.entities.Event.filter({ community_id: community.id }, "start_time"),
    ]).then(([activePolls, anns, evs]) => {
      setPolls(activePolls);
      setAnnouncements(anns);
      setEvents(evs);
      setLoading(false);
    });
  }, [community]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const banner = community?.photo_url;
  const firstName = user?.full_name?.split(" ")[0];

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden mb-8 warm-shadow">
        {banner ? (
          <div className="relative h-44 sm:h-60">
            <img src={banner} alt={community?.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 flex items-center gap-4">
              {community?.logo_url && (
                <img src={community.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-white/80 shadow-md" />
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">{community?.name}</h1>
                <p className="text-white/85 text-sm drop-shadow">Welcome back, {firstName}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary to-primary/70 p-6 sm:p-8 flex items-center gap-4">
            {community?.logo_url && (
              <img src={community.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-white/80" />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary-foreground">{community?.name}</h1>
              <p className="text-primary-foreground/85 text-sm">Welcome back, {firstName}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/home/account" className="bg-primary text-primary-foreground rounded-2xl p-6 hover:warm-shadow-md transition-all flex items-center gap-4">
          <UserCircle className="w-8 h-8" />
          <div><p className="font-semibold">My Account</p><p className="text-sm text-primary-foreground/80">Requests, bills & profile</p></div>
        </Link>
        <Link to="/home/announcements" className="bg-card rounded-2xl warm-shadow p-6 hover:warm-shadow-md transition-all flex items-center gap-4">
          <Megaphone className="w-8 h-8 text-primary" />
          <div><p className="font-semibold">Announcements</p><p className="text-sm text-muted-foreground">Latest community news</p></div>
        </Link>
        <Link to="/home/events" className="bg-card rounded-2xl warm-shadow p-6 hover:warm-shadow-md transition-all flex items-center gap-4">
          <CalendarIcon className="w-8 h-8 text-primary" />
          <div><p className="font-semibold">Events</p><p className="text-sm text-muted-foreground">Upcoming gatherings</p></div>
        </Link>
      </div>

      {/* Who to contact */}
      <div className="bg-accent/50 border border-accent rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Contact className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Questions? Here's who to contact</p>
            <p className="text-sm text-muted-foreground">Reach out to your HOA board for anything about the community. You can also ask the assistant below — it can email the board directly if it can't help.</p>
          </div>
        </div>
        <Link to="/home/board" className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:bg-primary/90 transition-colors">
          View Board Contacts
        </Link>
      </div>

      {/* Sliding Gallery — before announcements */}
      {community?.gallery?.length > 0 && (
        <div className="mb-6">
          <GallerySlideshow community={community} />
        </div>
      )}

      {/* Announcements + Active Polls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnnouncementsWidget announcements={announcements} />

        <div className="bg-card rounded-2xl warm-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2"><Vote className="w-5 h-5 text-primary" /> Active Polls</h2>
            <Link to="/home/polls" className="text-sm text-primary font-medium hover:underline">View all</Link>
          </div>
          {polls.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active polls</p>
          ) : (
            <div className="space-y-2">
              {polls.map(poll => (
                <Link key={poll.id} to="/home/polls" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{poll.title}</p>
                    <p className="text-xs text-muted-foreground">Deadline: {formatDate(poll.deadline)}</p>
                  </div>
                  <StatusBadge status={poll.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <CommunityCalendar invoices={[]} events={events} />
        <AIChatWidget />
      </div>
    </div>
  );
}