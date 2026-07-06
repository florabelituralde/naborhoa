import { base44 } from "@/api/base44Client";

// Fan out a notification to every homeowner in a community.
// type must match the Notification entity enum.
export async function notifyCommunity(community_id, { type, title, body, related_id }) {
  const residents = await base44.entities.User.filter({ community_id, role: "homeowner" });
  if (residents.length === 0) return;
  await base44.entities.Notification.bulkCreate(
    residents.map(r => ({
      community_id,
      user_id: r.id,
      type,
      title,
      body: body || "",
      related_id: related_id || "",
    }))
  );
}