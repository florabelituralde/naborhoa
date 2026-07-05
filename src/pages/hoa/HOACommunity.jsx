import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Copy, Check, Users, Home, UserCog, Send } from "lucide-react";

export default function HOACommunity() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [homeowners, setHomeowners] = useState([]);
  const [staff, setStaff] = useState([]);
  const [properties, setProperties] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("homeowner");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  const loadData = async () => {
    const [homes, staffList, props] = await Promise.all([
      base44.entities.User.filter({ community_id: community.id, role: "homeowner" }),
      base44.entities.User.filter({ community_id: community.id, role: "hoa_staff" }),
      base44.entities.Property.filter({ community_id: community.id }),
    ]);
    setHomeowners(homes);
    setStaff(staffList);
    setProperties(props);
    setLoading(false);
  };

  useEffect(() => { if (community) loadData(); }, [community]);

  const copyCode = () => {
    navigator.clipboard.writeText(community.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async () => {
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole === "hoa_staff" ? "admin" : "user");
      setInviteMsg(`Invitation sent to ${inviteEmail}. They'll receive an email to join.`);
      setInviteEmail("");
      setTimeout(() => { setShowInvite(false); setInviteMsg(""); }, 3000);
      loadData();
    } catch (err) {
      setInviteMsg(err.message || "Failed to send invitation");
    }
    setInviting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Community" subtitle="Manage members and settings" />

      {/* Join Code */}
      <div className="bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl p-6 mb-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">Share this code with homeowners to join your community</p>
        <div className="flex items-center justify-center gap-3">
          <p className="text-3xl font-bold tracking-widest text-primary">{community.join_code}</p>
          <button onClick={copyCode} className="p-2 rounded-lg hover:bg-primary/10 transition-colors">
            {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5 text-primary" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-2xl warm-shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{homeowners.length}</p><p className="text-sm text-muted-foreground">Homeowners</p></div>
          </div>
        </div>
        <div className="bg-card rounded-2xl warm-shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center"><Home className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold">{properties.length}</p><p className="text-sm text-muted-foreground">Properties</p></div>
          </div>
        </div>
        <div className="bg-card rounded-2xl warm-shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center"><UserCog className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold">{staff.length}</p><p className="text-sm text-muted-foreground">Staff</p></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Homeowners */}
        <div className="bg-card rounded-2xl warm-shadow p-6">
          <h2 className="font-semibold text-lg mb-4">Homeowners</h2>
          {homeowners.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No homeowners have joined yet</p>
          ) : (
            <div className="space-y-2">
              {homeowners.map(h => {
                const prop = properties.find(p => p.owner_id === h.id);
                return (
                  <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                      {h.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{h.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{prop?.address || "No property"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Staff */}
        <div className="bg-card rounded-2xl warm-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Staff Members</h2>
            {user.role === "hoa_admin" && (
              <Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>
                <Send className="w-4 h-4 mr-1" /> Invite
              </Button>
            )}
          </div>
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No staff members yet</p>
          ) : (
            <div className="space-y-2">
              {staff.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-semibold shrink-0">
                    {s.full_name?.[0]?.toUpperCase()}
                  </div>
                  <p className="font-medium text-sm">{s.full_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="mt-1.5" placeholder="colleague@example.com" />
            </div>
            <div>
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <button
                  onClick={() => setInviteRole("homeowner")}
                  className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all ${inviteRole === "homeowner" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Homeowner</span>
                </button>
                <button
                  onClick={() => setInviteRole("hoa_staff")}
                  className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all ${inviteRole === "hoa_staff" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <UserCog className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Staff</span>
                </button>
              </div>
            </div>
            {inviteMsg && <p className="text-sm text-primary">{inviteMsg}</p>}
            <Button onClick={handleInvite} disabled={!inviteEmail || inviting} className="w-full">
              {inviting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}