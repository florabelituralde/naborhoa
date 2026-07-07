import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NaborLogo from "@/components/NaborLogo";
import { CreditCard, Loader2, MapPin, ArrowLeft, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import PaymentFeeDisclosure from "@/components/PaymentFeeDisclosure";
import { calculateTotal } from "@/lib/paymentFee";

export default function GuestPayPortal() {
  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [community, setCommunity] = useState(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  const find = (e) => {
    e?.preventDefault();
    if (!address.trim() || searching) return;
    setSearching(true);
    setError("");
    setCommunity(null);
    base44.functions
      .invoke("find-community-by-address", { address })
      .then((res) => setCommunity(res.data.community))
      .catch((err) => setError(err.response?.data?.error || "We couldn't find that address."))
      .finally(() => setSearching(false));
  };

  const pay = () => {
    if (!community || paying) return;
    setPaying(true);
    setError("");
    base44.functions
      .invoke("stripe-checkout", {
        community_id: community.id,
        join_code: community.join_code,
        amount: community.monthly_dues || 45,
        description: `HOA Dues - ${community.name}`,
      })
      .then((res) => {
        if (res.data?.redirectUrl) {
          window.location.href = res.data.redirectUrl;
        } else {
          setError(res.data?.error || "Failed to start payment");
          setPaying(false);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Payment failed");
        setPaying(false);
      });
  };

  const dues = community?.monthly_dues || 45;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-16 bg-primary flex items-center px-4">
        <Link to="/login" className="flex items-center gap-2 text-white hover:text-white/80">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 text-center">
          <h1 className="text-white font-semibold">Pay Your HOA Dues</h1>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <NaborLogo iconClassName="w-10 h-10" textClassName="font-bold text-xl text-foreground" />
            </div>
            <h2 className="text-2xl font-bold">Guest Payment Portal</h2>
            <p className="text-sm text-muted-foreground mt-1">
              No account needed — enter your property address to pay your HOA dues.
            </p>
          </div>

          <div className="bg-card rounded-2xl warm-shadow-md p-6">
            <form onSubmit={find} className="space-y-2">
              <Label>Property Address</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="456 Oak Lane"
                    className="pl-10 h-11"
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={!address.trim() || searching} className="h-11 px-6">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find"}
                </Button>
              </div>
            </form>

            {error && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {community && (
              <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-1 text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Community found</span>
                </div>
                <h3 className="font-bold text-lg">{community.name}</h3>
                <div className="mt-3 p-3 rounded-lg bg-card">
                  <p className="text-2xl font-bold text-primary">${dues.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Monthly Dues</p>
                </div>
                <div className="mt-3">
                  <PaymentFeeDisclosure baseAmount={dues} />
                </div>
                <Button onClick={pay} disabled={paying} className="w-full h-12 mt-3">
                  {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  Pay ${calculateTotal(dues).toFixed(2)} Now
                </Button>
              </div>
            )}

            <div className="mt-5 p-3 rounded-xl bg-muted/50 flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Secure payment via Stripe. Sign up later to set up auto-pay and track payment history.
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Have a community code?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Use it here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}