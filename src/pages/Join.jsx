import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Loader2, Check, Search } from "lucide-react";

export default function Join() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [community, setCommunity] = useState(null);
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.community_id) navigate("/home/dashboard");
      setLoading(false);
    }).catch(() => navigate("/login"));
  }, []);

  const lookupCommunity = async () => {
    setError("");
    setSubmitting(true);
    try {
      const results = await base44.entities.Community.filter({ join_code: code.toUpperCase() });
      if (results.length > 0) {
        setCommunity(results[0]);
      } else {
        setError("No community found with that code");
      }
    } catch (err) {
      setError(err.message || "Failed to find community");
    }
    setSubmitting(false);
  };

  const joinCommunity = async () => {
    setSubmitting(true);
    try {
      const property = await base44.entities.Property.create({
        community_id: community.id,
        address: address,
        owner_id: user.id,
      });
      await base44.auth.updateMe({ community_id: community.id, property_id: property.id });
      navigate("/home/dashboard");
    } catch (err) {
      setError(err.message || "Failed to join community");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-20 bg-primary flex items-center px-8">
        <div className="flex items-center gap-2">
          <Home className="w-7 h-7 text-white" />
          <span className="text-white font-bold text-xl">NeighborHOA</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {!community ? (
            <div className="bg-card rounded-2xl warm-shadow-md p-8">
              <h2 className="text-2xl font-bold mb-1">Join your community</h2>
              <p className="text-muted-foreground mb-6">Enter the join code provided by your HOA</p>
              {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="code">Community Code</Label>
                  <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="ABC123" className="mt-1.5 h-12 text-lg tracking-widest uppercase" autoFocus />
                </div>
                <Button onClick={lookupCommunity} disabled={!code || submitting} className="w-full h-12">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Find Community
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl warm-shadow-md p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Home className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{community.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {community.address}{community.city && `, ${community.city}`}{community.state && `, ${community.state}`}
                </p>
              </div>
              {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="addr">Your Property Address</Label>
                  <Input id="addr" value={address} onChange={e => setAddress(e.target.value)} placeholder="456 Oak Lane" className="mt-1.5 h-11" autoFocus />
                </div>
                <Button onClick={joinCommunity} disabled={!address || submitting} className="w-full h-12">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Join Community
                </Button>
                <button onClick={() => { setCommunity(null); setError(""); }} className="w-full text-sm text-muted-foreground hover:text-foreground">
                  Use a different code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}