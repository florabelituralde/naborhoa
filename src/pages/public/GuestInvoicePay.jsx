import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import NaborLogo from "@/components/NaborLogo";
import { CreditCard, Loader2, ArrowLeft, Shield, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

const TYPE_LABELS = {
  dues: "HOA Dues",
  assessment: "Assessment",
  fee: "Fee",
  fine: "Fine / Penalty",
};

export default function GuestInvoicePay() {
  const { invoiceId } = useParams();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [community, setCommunity] = useState(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    base44.functions
      .invoke("get-public-invoice", { invoice_id: invoiceId })
      .then((res) => {
        setInvoice(res.data.invoice);
        setCommunity(res.data.community);
      })
      .catch((err) => setError(err.response?.data?.error || "Invoice not found."))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const pay = () => {
    if (!invoice || !community || paying) return;
    setPaying(true);
    setError("");
    base44.functions
      .invoke("stripe-checkout", {
        community_id: community.id,
        join_code: community.join_code,
        amount: invoice.amount,
        description: invoice.description || `${TYPE_LABELS[invoice.type] || "HOA Payment"} - ${community.name}`,
        invoice_id: invoice.id,
      })
      .then((res) => {
        if (res.data?.redirectUrl) {
          window.location.href = res.data.redirectUrl;
        } else {
          setError(res.data?.error || "Your HOA hasn't enabled online payments yet.");
          setPaying(false);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Payment failed");
        setPaying(false);
      });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const settled = invoice && (invoice.status === "paid" || invoice.status === "confirmed");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-16 bg-primary flex items-center px-4">
        <Link to={community ? `/c/${community.join_code}` : "/pay"} className="flex items-center gap-2 text-white hover:text-white/80">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 text-center"><h1 className="text-white font-semibold">Pay Your Bill</h1></div>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <NaborLogo iconClassName="w-10 h-10" textClassName="font-bold text-xl text-foreground" />
            </div>
            <h2 className="text-2xl font-bold">Guest Payment</h2>
            <p className="text-sm text-muted-foreground mt-1">No account needed — pay securely online.</p>
          </div>

          <div className="bg-card rounded-2xl warm-shadow-md p-6">
            {error ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : invoice ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{community?.name}</p>
                    <h3 className="font-bold">{TYPE_LABELS[invoice.type] || "HOA Payment"}</h3>
                  </div>
                </div>
                {invoice.description && <p className="text-sm text-muted-foreground mb-3">{invoice.description}</p>}
                {invoice.due_date && <p className="text-xs text-muted-foreground mb-3">Due: {formatDate(invoice.due_date)}</p>}
                <div className="p-4 rounded-xl bg-primary/5 mb-4 text-center">
                  <p className="text-3xl font-bold text-primary">{formatCurrency(invoice.amount)}</p>
                </div>

                {settled ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5" />
                    This bill has already been paid. Thank you!
                  </div>
                ) : (
                  <Button onClick={pay} disabled={paying} className="w-full h-12">
                    {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Pay {formatCurrency(invoice.amount)} Now
                  </Button>
                )}
              </>
            ) : null}

            <div className="mt-5 p-3 rounded-xl bg-muted/50 flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Secure payment via Stripe. Sign up later to set up auto-pay and track payment history.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}