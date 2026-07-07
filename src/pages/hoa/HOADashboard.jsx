import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import StatusBadge from "@/components/StatusBadge";
import { ClipboardList, DollarSign, Users, Loader2, Sparkles, UserPlus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import FinancialOverviewChart from "@/components/hoa/FinancialOverviewChart";
import JoinRequestsSection from "@/components/JoinRequestsSection";
import BoardRequestsApprovalSection from "@/components/board/BoardRequestsApprovalSection";
import { isInTrial, trialDaysLeft } from "@/lib/planAccess";

export default function HOADashboard() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [members, setMembers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pendingJoins, setPendingJoins] = useState(0);
  const [pendingBoardMembers, setPendingBoardMembers] = useState([]);

  const loadData = useCallback(async () => {
    if (!community) return;
    const [reqs, invs, mems, anns, exps, pending, boardMembers] = await Promise.all([
      base44.entities.Request.filter({ community_id: community.id }, "-created_date", 50),
      base44.entities.Invoice.filter({ community_id: community.id }, "-created_date", 500),
      base44.functions.invoke("get-community-homeowners", {}).then(r => r.data?.members || []).catch(() => []),
      base44.entities.Announcement.filter({ community_id: community.id }, "-created_date", 5),
      base44.entities.Expense.filter({ community_id: community.id }, "-created_date", 500),
      base44.functions.invoke("get-join-requests", {}).then(r => (r.data?.requests || []).filter(x => x.status === "pending").length).catch(() => 0),
      base44.functions.invoke("get-board-access-requests", {}).then(r => r.data?.pendingMembers || []).catch(() => []),
    ]);
    setRequests(reqs);
    setInvoices(invs);
    setMembers(mems);
    setAnnouncements(anns);
    setExpenses(exps);
    setPendingJoins(pending);
    setPendingBoardMembers(boardMembers);
  }, [community]);

  useEffect(() => {
    if (!community) {
      setLoading(false);
      return;
    }
    loadData().finally(() => setLoading(false));
  }, [community, loadData]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const openRequests = requests.filter(r => r.status === "submitted").length;
  const inProgress = requests.filter(r => r.status === "in_progress").length;
  const pendingTotal = invoices
    .filter(i => i.status === "pending" || i.status === "paid")
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <PullToRefresh onRefresh={loadData} className="p-4 sm:p-8 max-w-6xl mx-auto">
      <PageHeader title={`Welcome, ${user?.full_name?.split(" ")[0]}`} subtitle={community?.name} />

      {!community?.plan_id && (
        <div className="mb-8 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-accent/60 border border-accent">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              {isInTrial(community) ? (
                <>
                  <p className="font-semibold text-accent-foreground">
                    Free trial — {trialDaysLeft(community)} day{trialDaysLeft(community) === 1 ? "" : "s"} left
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You have full access to every feature. Choose a plan to keep them after your trial ends.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-accent-foreground">Your free trial has ended</p>
                  <p className="text-sm text-muted-foreground">
                    You've lost the AI resident assistant, automations, invoicing, polls and more. Upgrade to <span className="font-semibold text-foreground">Pro</span> to keep every feature — $99/mo.
                  </p>
                </>
              )}
            </div>
          </div>
          <Link
            to="/hoa/account"
            className="shrink-0 inline-flex items-center justify-center h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {isInTrial(community) ? "Choose a plan" : "Upgrade to Pro"}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={ClipboardList} value={openRequests} label="Open Requests" colorClass="bg-primary/10 text-primary" to="/hoa/requests" />
        <StatCard icon={UserPlus} value={pendingJoins + pendingBoardMembers.length} label="Pending Requests" colorClass="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" onClick={() => document.getElementById("membership-requests")?.scrollIntoView({ behavior: "smooth" })} />
        <StatCard icon={DollarSign} value={formatCurrency(pendingTotal)} label="Outstanding" colorClass="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" to="/hoa/invoices" />
        <StatCard icon={Users} value={members.length} label="Homeowners" colorClass="bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300" to="/hoa/community" />
      </div>

      <div id="membership-requests" className="mb-6 scroll-mt-6 space-y-6">
        <JoinRequestsSection />
        {pendingBoardMembers.length > 0 && (
          <BoardRequestsApprovalSection community={community} pendingMembers={pendingBoardMembers} onChange={loadData} />
        )}
      </div>

      <div className="mb-6">
        <FinancialOverviewChart invoices={invoices} expenses={expenses} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl warm-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Recent Requests</h2>
            <Link to="/hoa/requests" className="text-sm text-primary font-medium hover:underline">View all</Link>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No requests yet</p>
          ) : (
            <div className="space-y-2">
              {requests.slice(0, 5).map(req => (
                <Link key={req.id} to={`/hoa/requests/${req.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{req.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{req.category}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl warm-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Announcements</h2>
            <Link to="/hoa/announcements" className="text-sm text-primary font-medium hover:underline">View all</Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No announcements yet</p>
          ) : (
            <div className="space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">{ann.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-card rounded-2xl warm-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Members</h2>
          <Link to="/hoa/community" className="text-sm text-primary font-medium hover:underline">View all</Link>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No members have joined yet</p>
        ) : (
          <div className="space-y-2">
            {members.slice(0, 6).map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  {m.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{m.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}

function StatCard({ icon: Icon, value, label, colorClass, to, onClick }) {
  const interactive = Boolean(to || onClick);
  const inner = (
    <div className="flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
  const className = `bg-card rounded-2xl warm-shadow p-6 block w-full text-left ${interactive ? "hover:warm-shadow-md hover:-translate-y-0.5 transition-all cursor-pointer" : ""}`;

  if (to) return <Link to={to} className={className}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={className}>{inner}</button>;
  return <div className={className}>{inner}</div>;
}