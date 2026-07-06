import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Scheduled daily. Creates in-app notifications for residents whose HOA dues
// are due within the next 5 days or already overdue. Dedupes so a given
// invoice reminds a resident at most once per calendar day.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 5);

    const startOfDay = new Date(today).toISOString();

    // Unpaid invoices only
    const pending = await base44.asServiceRole.entities.Invoice.filter({ status: "pending" });
    const overdue = await base44.asServiceRole.entities.Invoice.filter({ status: "overdue" });
    const invoices = [...pending, ...overdue];

    let created = 0;

    for (const inv of invoices) {
      if (!inv.homeowner_id || !inv.due_date) continue;
      const due = new Date(inv.due_date);
      if (isNaN(due.getTime())) continue;
      // only remind for invoices due within horizon (or already past due)
      if (due > horizon) continue;

      // dedupe: skip if we already notified this user about this invoice today
      const existing = await base44.asServiceRole.entities.Notification.filter({
        user_id: inv.homeowner_id,
        related_id: inv.id,
        type: "invoice_created",
      }, "-created_date", 1);
      if (existing.length > 0 && new Date(existing[0].created_date) >= new Date(startOfDay)) {
        continue;
      }

      const isOverdue = due < today;
      const amount = typeof inv.amount === "number" ? `$${inv.amount.toFixed(2)}` : "";
      const dueLabel = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      await base44.asServiceRole.entities.Notification.create({
        community_id: inv.community_id,
        user_id: inv.homeowner_id,
        type: "invoice_created",
        title: isOverdue ? `Overdue: ${inv.description || "HOA dues"}` : `Payment due soon: ${inv.description || "HOA dues"}`,
        body: isOverdue
          ? `Your payment of ${amount} was due ${dueLabel}. Please pay as soon as possible.`
          : `Your payment of ${amount} is due ${dueLabel}.`,
        related_id: inv.id,
      });
      created++;
    }

    return Response.json({ ok: true, reminders_created: created, invoices_scanned: invoices.length });
  } catch (error) {
    console.error("sendDuesReminders error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});