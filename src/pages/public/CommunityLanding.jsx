import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Megaphone, Calendar, MapPin, Home, MessageCircle, CreditCard, Users, Loader2, ArrowRight, Shield } from "lucide-react";
import { formatDateTime } from "@/lib/format";

const ROLE_LABELS = {
  president: "President",
  vice_president: "Vice President",
  treasurer: "Treasurer",
  secretary: "Secretary",
  member_at_large: "Member at Large",
};

const TYPE_STYLES = {
  meeting: "bg-blue-50 text-blue-700",
  social: "bg-green-50 text-green-700",
  deadline: "bg-red-50 text-red-700",
};

export default function CommunityLanding() {
  const { joinCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    base44.functions.invoke("get-public-community", { join_code: joinCode }).then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(err => {
      setError(err.response?.data?.error || "Community not found");
      setLoading(false);
    });
  }, [joinCode]);

  const handlePay = async () => {
    if (!address.trim() || paying) return;
    setPaying(true);
    setPayError("");
    try {
      const community = data?.community;
      const res = await base44.functions.invoke("create-checkout", {
        community_id: community.id,
        join_code: joinCode,
        amount: community.monthly_dues || 45,
        description: `HOA Dues - ${community.name}`,
        property_address: address,
      });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        setPayError(res.data?.error || "Failed to start payment");
        setPaying(false);
      }
    } catch (err) {
      setPayError(err.response?.data?.error || "Payment failed. Please try again.");
      setPaying(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Community Not Found</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Link to="/login"><Button>Go to Nabor</Button></Link>
      </div>
    </div>
  );

  const { community, announcements, events, boardMembers } = data;
  const now = new Date();
  const upcoming = (events || []).filter(e => new Date(e.start_time) >= now);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative h-80 bg-primary overflow-hidden">
        {community.photo_url ? (
          <img src={community.photo_url} alt={community.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary to-primary/70" />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-5xl mx-auto text-white">
            <h1 className="text-4xl font-bold mb-2">{community.name}</h1>
            <p className="flex items-center gap-1.5 text-white/90">
              <MapPin className="w-4 h-4" />
              {[community.address, community.city, community.state].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {community.description && (
          <p className="text-lg text-muted-foreground mb-8 max-w-3xl">{community.description}</p>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Link to="/join">
            <div className="bg-card rounded-2xl warm-shadow p-5 hover:warm-shadow-md transition-all cursor-pointer h-full">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3"><Home className="w-5 h-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">Join Community</h3>
              <p className="text-sm text-muted-foreground">Sign up and become a member</p>
            </div>
          </Link>
          <Link to={`/c/${joinCode}/chat`}>
            <div className="bg-card rounded-2xl warm-shadow p-5 hover:warm-shadow-md transition-all cursor-pointer h-full">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3"><MessageCircle className="w-5 h-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">Ask AI Assistant</h3>
              <p className="text-sm text-muted-foreground">Get answers about HOA policies</p>
            </div>
          </Link>
          <a href="#pay-dues">
            <div className="bg-card rounded-2xl warm-shadow p-5 hover:warm-shadow-md transition-all cursor-pointer h-full">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3"><CreditCard className="w-5 h-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">Pay HOA Dues</h3>
              <p className="text-sm text-muted-foreground">{community.monthly_dues ? `$${community.monthly_dues}/month` : "Quick online payment"}</p>
            </div>
          </a>
        </div>

        {/* Pay Dues Inline */}
        <div id="pay-dues" className="bg-card rounded-2xl warm-shadow-md p-6 mb-10 scroll-mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-primary" /></div>
            <div>
              <h2 className="font-bold text-lg">Pay Your HOA Dues</h2>
              <p className="text-sm text-muted-foreground">No account needed — pay securely online</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-primary/5 mb-4">
            <p className="text-3xl font-bold text-primary">${(community.monthly_dues || 45).toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Monthly Dues</p>
          </div>
          {payError && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{payError}</div>}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter your property address" className="flex-1 h-11" />
            <Button onClick={handlePay} disabled={!address.trim() || paying} className="h-11 sm:px-8">
              {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Pay ${(community.monthly_dues || 45).toFixed(2)} Now
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            <span>Secure payment via Base44 Payments. <Link to="/join" className="text-primary font-medium hover:underline">Sign up</Link> to set up auto-pay and track payment history.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Announcements */}
          <div>
            <h2 className="font-bold text-xl mb-4 flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" /> Announcements</h2>
            {announcements?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No announcements yet</p>
            ) : (
              <div className="space-y-3">
                {announcements?.map(a => (
                  <div key={a.id} className="bg-card rounded-2xl warm-shadow p-5">
                    <div className="flex items-center gap-2 mb-1">
                      {a.pinned && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Pinned</span>}
                      <h3 className="font-semibold">{a.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Events */}
          <div>
            <h2 className="font-bold text-xl mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Upcoming Events</h2>
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map(ev => (
                  <div key={ev.id} className="bg-card rounded-2xl warm-shadow p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{ev.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_STYLES[ev.type] || TYPE_STYLES.meeting}`}>{ev.type}</span>
                    </div>
                    {ev.description && <p className="text-sm text-muted-foreground mb-2">{ev.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDateTime(ev.start_time)}</span>
                      {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.location}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Board Members */}
        {boardMembers?.length > 0 && (
          <div className="mt-10">
            <h2 className="font-bold text-xl mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Board Members</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {boardMembers.map(m => (
                <div key={m.id} className="bg-card rounded-2xl warm-shadow p-5 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xl mx-auto mb-3">
                    {m.name?.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-semibold">{m.name}</h3>
                  <p className="text-xs text-primary font-medium">{ROLE_LABELS[m.role]}</p>
                  {m.bio && <p className="text-xs text-muted-foreground mt-2">{m.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">Powered by <span className="font-semibold text-primary">Nabor</span></p>
        </div>
      </div>
    </div>
  );
}