import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Loader2, Check, Search, MapPin, KeyRound, AlertTriangle } from "lucide-react";
import JoinByCode from "@/components/JoinByCode";
import AddressAutocomplete from "@/components/AddressAutocomplete";

export default function Join() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [community, setCommunity] = useState(null);
  const [mode, setMode] = useState("code");
  const [address, setAddress] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { user: authUser } = useAuth();

  useEffect(() => {
    if (!authUser) return;
    let active = true;
    (async () => {
      setUser(authUser);
      if (authUser.community_id) {
        navigate("/home/dashboard");
        return;
      }
      try {
        const pending = await base44.entities.JoinRequest.filter({ homeowner_id: authUser.id, status: "pending" });
        if (!active) return;
        if (pending.length > 0) {
          navigate("/pending-approval");
          return;
        }
        setLoading(false);
      } catch {
        // A failed lookup shouldn't log the user out — let them use the form.
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [authUser, navigate]);

  const searchCommunities = async () => {
    setError("");
    setSearching(true);
    try {
      const all = await base44.entities.Community.list();
      const q = query.toLowerCase().trim();
      const filtered = q
        ? all.filter(c =>
            (c.name || "").toLowerCase().includes(q) ||
            (c.city || "").toLowerCase().includes(q) ||
            (c.state || "").toLowerCase().includes(q) ||
            (c.zip || "").toLowerCase().includes(q)
          )
        : all;
      setResults(filtered);
      setSearched(true);
      if (filtered.length === 0) setError("No communities found. Try a different search.");
    } catch (err) {
      setError(err.message || "Search failed");
    }
    setSearching(false);
  };

  const joinCommunity = async () => {
    setSubmitting(true);
    try {
      const created = await base44.entities.JoinRequest.create({
        community_id: community.id,
        community_name: community.name,
        homeowner_id: user.id,
        homeowner_name: user.full_name,
        homeowner_email: user.email,
        address: address,
        status: "pending",
      });
      base44.functions.invoke("notify-join-request", { request_id: created.id }).catch(() => {});
      navigate("/pending-approval");
    } catch (err) {
      setError(err.message || "Failed to submit request");
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
          <span className="text-white font-bold text-xl">Nabor</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {!community ? (
            <div className="bg-card rounded-2xl warm-shadow-md p-8">
              <h2 className="text-2xl font-bold mb-1">Find your community</h2>
              <p className="text-muted-foreground mb-6">Enter your community's join code, or search by name or location</p>

              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted mb-6">
                <button
                  onClick={() => { setMode("code"); setError(""); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "code" ? "bg-card warm-shadow text-foreground" : "text-muted-foreground"}`}
                >
                  <KeyRound className="w-4 h-4" /> Join Code
                </button>
                <button
                  onClick={() => { setMode("search"); setError(""); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "search" ? "bg-card warm-shadow text-foreground" : "text-muted-foreground"}`}
                >
                  <Search className="w-4 h-4" /> Search
                </button>
              </div>

              {mode === "code" ? (
                <JoinByCode onFound={(c) => { setCommunity(c); setError(""); }} />
              ) : (
              <>
              {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input id="search" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && searchCommunities()} placeholder="e.g. Oakwood Hills, Austin, or 78701" className="mt-1.5 h-12" autoFocus />
                </div>
                <Button onClick={searchCommunities} disabled={searching} className="w-full h-12">
                  {searching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Search Communities
                </Button>
              </div>
              {searched && results.length > 0 && (
                <div className="mt-6 space-y-2">
                  {results.map(c => (
                    <button key={c.id} onClick={() => { setCommunity(c); setError(""); }} className="w-full text-left rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors overflow-hidden">
                      {c.photo_url && (
                        <img src={c.photo_url} alt={c.name} className="w-full h-28 object-cover" />
                      )}
                      <div className="flex items-start gap-3 p-4">
                        <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs font-medium text-primary">
                            {[[c.city, c.state].filter(Boolean).join(", "), c.zip].filter(Boolean).join(" ") || "Location not set"}
                          </p>
                          {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              </>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-2xl warm-shadow-md overflow-hidden">
              {community.photo_url && (
                <img src={community.photo_url} alt={community.name} className="w-full h-40 object-cover" />
              )}
              <div className="p-8">
              <div className="text-center mb-6">
                {!community.photo_url && (
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Home className="w-7 h-7 text-primary" />
                  </div>
                )}
                <h2 className="text-xl font-bold">{community.name}</h2>
                <p className="text-sm font-medium text-primary flex items-center justify-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {[[community.city, community.state].filter(Boolean).join(", "), community.zip].filter(Boolean).join(" ") || "Location not set"}
                </p>
              </div>
              {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="addr">Your Property Address</Label>
                  <AddressAutocomplete
                    value={address}
                    onChange={({ address: addr, zip }) => { setAddress(addr); setAddressZip(zip || ""); }}
                  />
                </div>
                {addressZip && community?.zip && addressZip !== community.zip && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      The ZIP code in your address ({addressZip}) doesn't match this community's ZIP ({community.zip}). Double-check that you've selected the correct community.
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Your request will be reviewed by the HOA admin or a board member before you're granted access.</p>
                <Button onClick={joinCommunity} disabled={!address || submitting} className="w-full h-12">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Request to Join
                </Button>
                <button onClick={() => { setCommunity(null); setError(""); setResults([]); setSearched(false); }} className="w-full text-sm text-muted-foreground hover:text-foreground">
                  Choose a different community
                </button>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}