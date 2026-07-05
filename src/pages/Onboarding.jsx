import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Home, ArrowRight, Loader2, Check } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [org, setOrg] = useState({ name: "", type: "standalone_hoa", description: "" });
  const [community, setCommunity] = useState({ name: "", address: "", city: "", state: "", description: "" });
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.community_id) navigate("/hoa/dashboard");
      setLoading(false);
    }).catch(() => navigate("/login"));
  }, []);

  const handleCreateOrg = async () => {
    setSubmitting(true);
    try {
      const orgRecord = await base44.entities.Organization.create(org);
      await base44.auth.updateMe({ organization_id: orgRecord.id });
      setUser({ ...user, organization_id: orgRecord.id });
      setStep(2);
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const handleCreateCommunity = async () => {
    setSubmitting(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const commRecord = await base44.entities.Community.create({
        ...community,
        organization_id: user.organization_id,
        join_code: code,
      });
      await base44.auth.updateMe({ community_id: commRecord.id });
      setJoinCode(code);
      setStep(3);
    } catch (err) {
      console.error(err);
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
        <div className="w-full max-w-lg">
          <div className="flex items-center justify-center gap-2 mb-10">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${step >= s ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`w-16 h-0.5 transition-all ${step > s ? "bg-primary" : "bg-muted"}`} />}
              </React.Fragment>
            ))}
          </div>

          {step === 1 && (
            <div className="bg-card rounded-2xl warm-shadow-md p-8">
              <h2 className="text-2xl font-bold mb-1">Set up your organization</h2>
              <p className="text-muted-foreground mb-6">Tell us about your HOA organization</p>
              <div className="space-y-4">
                <div>
                  <Label>Organization Type</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button type="button" onClick={() => setOrg({ ...org, type: "standalone_hoa" })}
                      className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left ${org.type === "standalone_hoa" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <Home className={`w-5 h-5 ${org.type === "standalone_hoa" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">Single HOA</span>
                      <span className="text-xs text-muted-foreground">One neighborhood</span>
                    </button>
                    <button type="button" onClick={() => setOrg({ ...org, type: "management_company" })}
                      className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left ${org.type === "management_company" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <Building2 className={`w-5 h-5 ${org.type === "management_company" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">Management Co.</span>
                      <span className="text-xs text-muted-foreground">Multiple communities</span>
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input id="orgName" value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })} placeholder="Maple Street HOA" className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label htmlFor="orgDesc">Description (optional)</Label>
                  <Textarea id="orgDesc" value={org.description} onChange={e => setOrg({ ...org, description: e.target.value })} placeholder="A brief description..." className="mt-1.5" rows={3} />
                </div>
                <Button onClick={handleCreateOrg} disabled={!org.name || submitting} className="w-full h-12">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-card rounded-2xl warm-shadow-md p-8">
              <h2 className="text-2xl font-bold mb-1">Create your community</h2>
              <p className="text-muted-foreground mb-6">Set up the neighborhood you'll manage</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="commName">Community Name</Label>
                  <Input id="commName" value={community.name} onChange={e => setCommunity({ ...community, name: e.target.value })} placeholder="Maple Street Estates" className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label htmlFor="commAddr">Street Address</Label>
                  <Input id="commAddr" value={community.address} onChange={e => setCommunity({ ...community, address: e.target.value })} placeholder="123 Main St" className="mt-1.5 h-11" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="commCity">City</Label>
                    <Input id="commCity" value={community.city} onChange={e => setCommunity({ ...community, city: e.target.value })} className="mt-1.5 h-11" />
                  </div>
                  <div>
                    <Label htmlFor="commState">State</Label>
                    <Input id="commState" value={community.state} onChange={e => setCommunity({ ...community, state: e.target.value })} className="mt-1.5 h-11" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="commDesc">Description (optional)</Label>
                  <Textarea id="commDesc" value={community.description} onChange={e => setCommunity({ ...community, description: e.target.value })} className="mt-1.5" rows={3} />
                </div>
                <Button onClick={handleCreateCommunity} disabled={!community.name || submitting} className="w-full h-12">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  Create Community
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-card rounded-2xl warm-shadow-md p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
              <p className="text-muted-foreground mb-6">Share this code with homeowners so they can join your community</p>
              <div className="bg-primary/5 border-2 border-dashed border-primary/30 rounded-xl py-6 px-4 mb-6">
                <p className="text-sm text-muted-foreground mb-1">Community Join Code</p>
                <p className="text-4xl font-bold tracking-widest text-primary">{joinCode}</p>
              </div>
              <Button onClick={() => navigate("/hoa/dashboard")} className="w-full h-12">
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}