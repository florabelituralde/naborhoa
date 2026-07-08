import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import NaborLogo from "@/components/NaborLogo";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import WaitlistForm from "@/components/WaitlistForm";
import PaymentFeeDisclosure from "@/components/PaymentFeeDisclosure";
import { calculateTotal } from "@/lib/paymentFee";
import { formatCurrency, formatDate } from "@/lib/format";
import { CreditCard, Loader2, ArrowLeft, Shield, AlertCircle, CheckCircle2, FileText, MapPin, Building2, Mail, ArrowRight } from "lucide-react";

const TYPE_LABELS = {
  dues: "HOA Dues",
  assessment: "Assessment",
  fee: "Fee",
  fine: "Fine / Penalty",
};

export default function GuestPayPortal() {
  const [step, setStep] = useState("search"); // search → otp → invoices
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [otp, setOtp] = useState("");
  const [community, setCommunity] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState(null);

  const initiate = (e) => {
    e?.preventDefault();
    if (!address.trim() || !email.trim() || loading) return;
    setLoading(true);
    setError("");
    base44.functions
      .invoke("initiate-guest-payment", { address, email })
      .then((res) => {
        setVerificationId(res.data.verification_id);
        setStep("otp");
      })
      .catch((err) => setError(err.response?.data?.error || "No invoice found for this address and email."))
      .finally(() => setLoading(false));
  };

  const verifyOtp = (e) => {
    e?.preventDefault();
    if (otp.length < 6 || loading || !verificationId) return;
    setLoading(true);
    setError("");
    base44.functions
      .invoke("verify-guest-otp", { verification_id: verificationId, otp })
      .then((res) => {
        setCommunity(res.data.community);
        setOrganization(res.data.organization);
        setInvoices(res.data.invoices || []);
        setStep("invoices");
      })
      .catch((err) => setError(err.response?.data?.error || "Verification failed."))
      .finally(() => setLoading(false));
  };

  const payInvoice = (invoice) => {
    if (!community || payingId) return;
    setPayingId(invoice.id);
    setError("");
    base44.functions
      .invoke("stripe-checkout", {
        community_id: community.id,
        join_code: community.join_code,
        invoice_id: invoice.id,
        amount: invoice.amount,
        description: invoice.description || `${TYPE_LABELS[invoice.type] || "HOA Payment"} - ${community.name}`,
        customer_email: email,
        customer_name: address,
        address,
      })
      .then((res) => {
        if (res.data?.redirectUrl) {
          window.location.href = res.data.redirectUrl;
        } else {
          setError(res.data?.error || "Your HOA hasn't enabled online payments yet.");
          setPayingId(null);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Payment failed");
        setPayingId(null);
      });
  };

  const startOver = () => {
    setStep("search");
    setAddress("");
    setEmail("");
    setOtp("");
    setVerificationId(null);
    setCommunity(null);
    setOrganization(null);
    setInvoices([]);
    setError("");
  };

  const unpaidInvoices = invoices.filter((inv) => inv.status !== "paid" && inv.status !== "confirmed");
  const paidInvoices = invoices.filter((inv) => inv.status === "paid" || inv.status === "confirmed");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-16 bg-primary flex items-center px-4">
        <Link to="/login" className="flex items-center gap-2 text-white hover:text-white/80">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 text-center">
          <h1 className="text-white font-semibold">Pay Your HOA Bill</h1>
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
              No account needed — verify your email to find and pay your HOA invoice.
            </p>
          </div>

          <div className="bg-card rounded-2xl warm-shadow-md p-6">
            {/* Step 1: Address + Email */}
            {step === "search" && (
              <>
                <form onSubmit={initiate} className="space-y-3">
                  <div>
                    <Label>Property Address</Label>
                    <AddressAutocomplete
                      value={address}
                      onChange={({ address: addr }) => setAddress(addr)}
                      placeholder="Search your full property address"
                    />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="h-11 pl-9"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={!address.trim() || !email.trim() || loading} className="w-full h-11">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                    Find & Verify
                  </Button>
                </form>

                {error && (
                  <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {error && !community && (
                  <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30">
                    <WaitlistForm initialAddress={address} title="Join the waitlist" />
                  </div>
                )}

                <div className="mt-4 p-3 rounded-xl bg-primary/5 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    For your security, we verify your email with a one-time code before showing your invoices.
                  </p>
                </div>
              </>
            )}

            {/* Step 2: OTP verification */}
            {step === "otp" && (
              <>
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Check your email</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
                  </p>
                </div>

                <form onSubmit={verifyOtp} className="space-y-4">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button type="submit" disabled={otp.length < 6 || loading} className="w-full h-11">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Verify Code
                  </Button>
                </form>

                {error && (
                  <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button onClick={startOver} className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4">
                  ← Use a different address or email
                </button>
              </>
            )}

            {/* Step 3: Invoice list */}
            {step === "invoices" && community && (
              <div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Email verified</span>
                  </div>
                  <h3 className="font-bold text-lg">{community.name}</h3>
                  {(community.city || community.state) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {[community.city, community.state].filter(Boolean).join(", ")} {community.zip}
                    </p>
                  )}
                  {organization && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Managed by {organization.name}
                    </p>
                  )}
                </div>

                {unpaidInvoices.length === 0 && paidInvoices.length > 0 ? (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5" />
                    All invoices for this address have been paid. Thank you!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unpaidInvoices.map((inv) => (
                      <div key={inv.id} className="rounded-xl border border-border p-4">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{TYPE_LABELS[inv.type] || "HOA Payment"}</p>
                            {inv.description && <p className="text-xs text-muted-foreground mt-0.5">{inv.description}</p>}
                            {inv.due_date && <p className="text-xs text-muted-foreground mt-0.5">Due: {formatDate(inv.due_date)}</p>}
                          </div>
                          <p className="text-xl font-bold text-primary shrink-0">{formatCurrency(inv.amount)}</p>
                        </div>
                        <div className="my-3">
                          <PaymentFeeDisclosure baseAmount={inv.amount} />
                        </div>
                        <Button
                          onClick={() => payInvoice(inv)}
                          disabled={payingId !== null}
                          className="w-full h-11"
                        >
                          {payingId === inv.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                          Pay {formatCurrency(calculateTotal(inv.amount))} Now
                        </Button>
                      </div>
                    ))}
                    {paidInvoices.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paid Invoices</p>
                        {paidInvoices.map((inv) => (
                          <div key={inv.id} className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{TYPE_LABELS[inv.type] || "HOA Payment"}</p>
                              {inv.description && <p className="text-xs text-muted-foreground truncate">{inv.description}</p>}
                            </div>
                            <p className="text-sm font-semibold text-muted-foreground">{formatCurrency(inv.amount)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button onClick={startOver} className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4">
                  ← Search a different address
                </button>
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