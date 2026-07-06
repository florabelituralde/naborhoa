import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bell, Megaphone, Vote, Receipt, CheckCircle2, ClipboardList, Trophy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateTime } from "@/lib/format";

const ICONS = {
  announcement: Megaphone,
  poll_deadline: Vote,
  invoice_created: Receipt,
  payment_confirmed: CheckCircle2,
  request_update: ClipboardList,
  election: Trophy,
};

export default function NotificationBell({ user }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const rows = await base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 30);
    setItems(rows);
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const unsub = base44.entities.Notification.subscribe(() => load());
    return unsub;
  }, [user, load]);

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
    setOpen(false);
    const routes = {
      announcement: "/home/announcements",
      poll_deadline: "/home/polls",
      election: "/home/elections",
      invoice_created: "/home/invoices",
      payment_confirmed: "/home/invoices",
      request_update: "/home/requests",
    };
    if (routes[n.type]) navigate(routes[n.type]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative w-9 h-9 rounded-lg hover:bg-accent flex items-center justify-center transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary font-medium hover:underline">Mark all read</button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">You're all caught up</div>
          ) : (
            items.map(n => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 border-b border-border last:border-0 hover:bg-accent transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatDateTime(n.created_date)}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}