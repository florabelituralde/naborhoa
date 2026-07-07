import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Home, ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react";
import PlanSelector from "@/components/onboarding/PlanSelector";
import CommunityPhotosStep from "@/components/onboarding/CommunityPhotosStep";
import CommunityDocumentsStep from "@/components/onboarding/CommunityDocumentsStep";

const TOTAL_STEPS = 6;

export default function Onboarding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [org, setOrg] = useState({ name: "", type: "standalone_hoa", description: "" });
  const [community, setCommunity] = useState({ name: "", city: "", state: "", zip: "", description: "" });
  const [photos, setPhotos] = useState({ photo_url: "", gallery: [] });
  const [docs, setDocs] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [communityId, setCommunityId] = useState("");
  const [dupError, setDupError] = useState("");

  const { user: authUser } = useAuth();

  useEffect(() => {
    if (!authUser) return;
    setUser(authUser);
    if (authUser.community_id) {
      navigate("/hoa/dashboard");
      return;
    }
    // Prefill the org/community name captured during registration.
    if (authUser.pending_org_name) {
      setOrg(o => ({ ...o, name: authUser.pending_org_name }));
    }
    setLoading(false);
  }, [authUser, navigate]);

  const handleCreateOrg = async () => {
    setSubmitting(true);
    try {
      const orgRecord = await base44.entities.Organization.create(org);
      await base44.auth.updateMe({ organization_id: orgRecord.id });
      setUser({ ...user, organization_id: orgRecord.id });
      setCommunity(c => ({ ...c, name: org.name }));
      setStep(2);
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  // Blocks continuing past the details step if a community with the same name
  // already exists in the same zip code. Multiple communities may share a zip
  // code as long as their names differ.
  const handleCommunityContinue = async () => {
    setDupError("");
    setSubmitting(true);
    try {
      const name = (community.name || org.name || "").trim().toLowerCase();
      const zip = community.zip.trim().toLowerCase();
      if (name && zip) {
        const existing = await base44.entities.Community.list();
        const clash = existing.find(c =>
          (c.name || "").trim().toLowerCase() === name &&
          (c.zip || "").trim().toLowerCase() === zip
        );
        if (clash) {
          setDupError(`A community named "${clash.name}" already exists in zip code ${community.zip}. Please choose a different name.`);
          setSubmitting(false);
          return;
        }
      }
      setStep(3);
    } catch (err) {
      console.error(err);
      setDupError("Could not verify community name. Please try again.");
    }
    setSubmitting(false);
  };

  // Creates the community (with photos) and any staged documents, then advances to plan selection.
  const handleFinishCommunity = async () => {
    setSubmitting(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const commRecord = await base44.entities.Community.create({
        ...community,
        photo_url: photos.photo_url || undefined,
        gallery: photos.gallery || [],
        organization_id: user.organization_id,
        join_code: code,
      });
      await base44.auth.updateMe({ community_id: commRecord.id });

      if (docs.length > 0) {
        await base44.entities.Document.bulkCreate(
          docs.map(d => ({
            community_id: commRecord.id,
            title: d.title,
            category: d.category,
            file_url: d.file_url,
            file_type: d.file_type,
            uploaded_by_id: user.id,
            is_public: true,
          }))
        );
      }

      setJoinCode(code);
      setCommunityId(commRecord.id);
      setStep(5);
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const handleSelectPlan = async (planId, cycleId) => {
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("create-plan-checkout", {
        community_id: communityId,
        plan_id: planId,
        billing_cycle: cycleId,
      });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
        return;
      }
      console.error("No redirect URL", res.data);
      setSubmitting(false);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  // Start the 14-day free trial: leave the community with no plan and a pending
  // status so isInTrial() grants full access until the trial window elapses.
  const handleStartTrial = () => setStep(6);

  // Use the free version now: mark the community "ended" so it drops straight to
  // the Free tier with locked features visible in the nav.
  const handleUseFreeVersion = async () => {
    setSubmitting(true);
    try {
      if (communityId) {
        await base44.entities.Community.update(communityId, { subscription_status: "ended" });
      }
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
    setStep(6);
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
        <div className={`w-full ${step === 5 ? "max-w-4xl" : "max-w-lg"}`}>
          <div className="flex items-center justify-center gap-1.5 mb-10">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${step >= s ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < TOTAL_STEPS && <div className={`w-6 h-0.5 transition-all ${step > s ? "bg-primary" : "bg-muted"}`} />}
              </React.Fragment>
            ))}
          </div>

          {step === 1 && (
            <div className="bg-card rounded-2xl warm-shadow-md p-8">
              <h2 className="text-2xl font-bold mb-1">Set up your organization</h2>
              <p className="text-muted-foreground mb-6">Tell us about your HOA organization</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="orgName">Community / Organization Name</Label>
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
              <p className="text-muted-foreground mb-6">Where is {org.name || "your community"} located?</p>
              {dupError && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{dupError}</div>}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="commCity">City</Label>
                    <Input id="commCity" value={community.city} onChange={e => setCommunity({ ...community, city: e.target.value })} placeholder="Austin" className="mt-1.5 h-11" />
                  </div>
                  <div>
                    <Label htmlFor="commState">State</Label>
                    <Input id="commState" value={community.state} onChange={e => setCommunity({ ...community, state: e.target.value })} placeholder="TX" className="mt-1.5 h-11" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="commZip">Zip Code</Label>
                  <Input id="commZip" value={community.zip} onChange={e => setCommunity({ ...community, zip: e.target.value })} placeholder="78701" className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label htmlFor="commDesc">Description (optional)</Label>
                  <Textarea id="commDesc" value={community.description} onChange={e => setCommunity({ ...community, description: e.target.value })} className="mt-1.5" rows={3} />
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-12">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button onClick={handleCommunityContinue} disabled={!community.city || submitting} className="flex-1 h-12">
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <CommunityPhotosStep
              value={photos}
              onChange={setPhotos}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <CommunityDocumentsStep
              value={docs}
              onChange={setDocs}
              onFinish={handleFinishCommunity}
              onBack={() => setStep(3)}
              submitting={submitting}
            />
          )}

          {step === 5 && (
            <div>
              <PlanSelector
                onSelect={handleSelectPlan}
                onTrial={handleStartTrial}
                onFree={handleUseFreeVersion}
                submitting={submitting}
              />
            </div>
          )}

          {step === 6 && (
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