import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Bell, Megaphone, Vote, Receipt, CheckCircle2, ClipboardList, Trophy, Loader2, CheckCheck } from "lucide-react";
import { formatDateTime } from "@/lib/format";

const ICONS = {
  announcement: Megaphone,
  poll_deadline: Vote,
  invoice_created: Receipt,
  payment_confirmed: CheckCircle2,
  request_update: ClipboardList,
  election: Trophy,
};

const ROUTES = {
  announcement: "/home/announcements",
  poll_deadline: "/home/polls",
  election: "/home/elections",
  invoice_created: "/home/invoices",
  payment_confirmed: "/home/invoices",
  request_update: "/home/requests",
};

export default function HomeNotifications() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 100);
    setItems(rows);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    const unsub = base44.entities.Notification.subscribe(() => load());
    return unsub;
  }, [load]);

  const unread = items.filter(i => !i.read).length;

  const markAllRead = async () => {
    const unreadItems = items.filter(i => !i.read);
    if (unreadItems.length === 0) return;
    await base44.entities.Notification.bulkUpdate(unreadItems.map(i => ({ id: i.id, read: true })));
    setItems(prev => prev.map(i => ({ ...i, read: true })));
  };

  const handleClick = async (n) => {
    if (!n.read) {
      await base44.entities.Notification.update(n.id, { read: true });
      setItems(prev => prev.map(i => i.id === n.id ? { ...i, read: true } : i));
    }
    if (ROUTES[n.type]) navigate(ROUTES[n.type]);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Notifications"
        subtitle="All your reminders and updates"
        action={unread > 0 && (
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-2" /> Mark all read
          </Button>
        )}
      />

      <div className="bg-card rounded-2xl warm-shadow overflow-hidden">
        {items.length === 0 ? (
          <div className="px-4 py-20 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">You're all caught up</p>
          </div>
        ) : (
          items.map(n => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-4 flex gap-3 border-b border-border last:border-0 hover:bg-accent transition-colors ${!n.read ? "bg-primary/5" : ""}`}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.created_date)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}