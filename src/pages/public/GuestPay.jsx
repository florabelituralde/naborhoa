import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Home, Loader2, CreditCard, ArrowLeft, Shield } from "lucide-react";
import PaymentFeeDisclosure from "@/components/PaymentFeeDisclosure";
import { calculateTotal } from "@/lib/paymentFee";
import AddressAutocomplete from "@/components/AddressAutocomplete";

export default function GuestPay() {
  const { joinCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState(null);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    base44.functions.invoke("get-public-community", { join_code: joinCode }).then(res => {
      setCommunity(res.data.community);
      setLoading(false);
    }).catch(err => {
      setError(err.response?.data?.error || "Community not found");
      setLoading(false);
    });
  }, [joinCode]);

  const handlePay = async () => {
    setPaying(true);
    setError("");
    try {
      const res = await base44.functions.invoke("stripe-checkout", {
        community_id: community.id,
        join_code: joinCode,
        amount: community.monthly_dues || 45,
        description: `HOA Dues - ${community.name}`,
      });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        setError(res.data?.error || "Your HOA hasn't enabled online payments yet.");
        setPaying(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Payment failed");
      setPaying(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (error && !community) return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Community Not Found</h1>
        <Link to="/login"><Button>Go to Nabor HOA</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 bg-primary flex items-center px-4">
        <Link to={`/c/${joinCode}`} className="flex items-center gap-2 text-white hover:text-white/80">
          <ArrowLeft className="w-5 h-5" />
          <Home className="w-5 h-5" />
        </Link>
        <div className="flex-1 text-center"><h1 className="text-white font-semibold">Pay HOA Dues</h1></div>
        <div className="w-9" />
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl warm-shadow-md p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold">{community.name}</h2>
              <p className="text-sm text-muted-foreground">Pay your monthly HOA dues</p>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 mb-4 text-center">
              <p className="text-3xl font-bold text-primary">${(community.monthly_dues || 45).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Monthly Dues</p>
            </div>

            <div className="mb-6">
              <PaymentFeeDisclosure baseAmount={community.monthly_dues || 45} />
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

            <div className="space-y-4">
              <div>
                <Label>Property Address</Label>
                <div className="mt-1.5">
                  <AddressAutocomplete
                    value={address}
                    onChange={({ address: addr }) => setAddress(addr)}
                    placeholder="Search your property address"
                  />
                </div>
              </div>
              <Button onClick={handlePay} disabled={!address || paying} className="w-full h-12">
                {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                Pay ${calculateTotal(community.monthly_dues || 45).toFixed(2)} Now
              </Button>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-muted/50 flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Secure Payment</p>
                <p className="text-xs text-muted-foreground">Your payment is processed securely. No account needed — sign up later to set up automatic payments and track your payment history.</p>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link to="/join" className="text-primary font-medium hover:underline">Sign up</Link> to set up auto-pay
          </p>
        </div>
      </div>
    </div>
  );
}