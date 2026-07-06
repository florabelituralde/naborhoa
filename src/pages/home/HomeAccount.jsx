import React, { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { ClipboardList, Receipt, Loader2, Plus, History, RefreshCw, User as UserIcon, Mail } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import RequestBoardAccessCard from "@/components/board/RequestBoardAccessCard";
import MoveOutDialog from "@/components/MoveOutDialog";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
import LegalLinks from "@/components/LegalLinks";

export default function HomeAccount() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (!community) {
      setLoading(false);
      return;
    }
    Promise.all([
      base44.entities.Request.filter({ community_id: community.id, homeowner_id: user.id }, "-created_date"),
      base44.entities.Invoice.filter({ community_id: community.id, homeowner_id: user.id }, "-created_date"),
      base44.entities.Subscription.filter({ community_id: community.id, homeowner_id: user.id, status: "active" }),
    ]).then(([reqs, invs, subs]) => {
      setRequests(reqs);
      setInvoices(invs);
      setSubscription(subs.length > 0 ? subs[0] : null);
    }).finally(() => setLoading(false));
  }, [community, user]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const openRequests = requests.filter(r => r.status === "submitted" || r.status === "in_progress").length;
  const pendingBills = invoices.filter(i => i.status === "pending" || i.status === "paid");
  const pendingTotal = pendingBills.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <PageHeader title="My Account" subtitle="Your requests, bills, and personal details" />

      {/* Profile */}
      <div className="bg-card rounded-2xl warm-shadow p-6 mb-8 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
          {user?.full_name?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-lg truncate flex items-center gap-2"><UserIcon className="w-4 h-4 text-muted-foreground" />{user?.full_name}</p>
          <p className="text-sm text-muted-foreground truncate flex items-center gap-2"><Mail className="w-4 h-4" />{user?.email}</p>
        </div>
      </div>

      {/* Board access */}
      <div className="mb-8">
        <RequestBoardAccessCard user={user} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <StatCard icon={ClipboardList} value={openRequests} label="Active Requests" colorClass="bg-primary/10 text-primary" />
        <StatCard icon={Receipt} value={formatCurrency(pendingTotal)} label="Outstanding Balance" colorClass="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link to="/home/requests/new" className="bg-primary text-primary-foreground rounded-2xl p-6 hover:warm-shadow-md transition-all flex items-center gap-4">
          <Plus className="w-8 h-8" />
          <div><p className="font-semibold">New Request</p><p className="text-sm text-primary-foreground/80">Submit a maintenance or repair</p></div>
        </Link>
        <Link to="/home/invoices" className="bg-card rounded-2xl warm-shadow p-6 hover:warm-shadow-md transition-all flex items-center gap-4">
          <Receipt className="w-8 h-8 text-primary" />
          <div><p className="font-semibold">Pay Bills</p><p className="text-sm text-muted-foreground">View and pay invoices</p></div>
        </Link>
      </div>

      {/* Payment History */}
      <div className="bg-card rounded-2xl warm-shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Payment History</h2>
          <Link to="/home/invoices" className="text-sm text-primary font-medium hover:underline">View all</Link>
        </div>
        {subscription ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 mb-3">
            <RefreshCw className="w-4 h-4 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Auto-Pay Active</p>
              <p className="text-xs text-muted-foreground">{subscription.frequency === "MONTH" ? "Monthly" : "Annual"} • {formatCurrency(subscription.amount || 0)}</p>
            </div>
          </div>
        ) : null}
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No payment history yet</p>
        ) : (
          <div className="space-y-2">
            {invoices.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm capitalize">{inv.type} — {formatCurrency(inv.amount)}</p>
                  <p className="text-xs text-muted-foreground">{inv.description}</p>
                  <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>Due: {formatDate(inv.due_date)}</span>
                    {inv.paid_date && <span>Paid: {formatDate(inv.paid_date)}</span>}
                  </div>
                </div>
                <StatusBadge status={inv.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Requests */}
      <div className="bg-card rounded-2xl warm-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">My Requests</h2>
          <Link to="/home/requests" className="text-sm text-primary font-medium hover:underline">View all</Link>
        </div>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No requests yet</p>
        ) : (
          <div className="space-y-2">
            {requests.slice(0, 6).map(req => (
              <Link key={req.id} to={`/home/requests/${req.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{req.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(req.created_date)}</p>
                </div>
                <StatusBadge status={req.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Moving out */}
      <div className="mt-8">
        <MoveOutDialog />
      </div>

      {/* Account deletion — required by App Store guideline 5.1.1(v) */}
      <div className="mt-8">
        <DeleteAccountDialog user={user} />
      </div>

      <div className="mt-8 pt-6 border-t border-border">
        <LegalLinks />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, colorClass }) {
  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}