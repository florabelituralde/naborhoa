import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const joinCode = (body.join_code || "").toUpperCase();

    if (!joinCode) {
      return Response.json({ error: "Missing join_code" }, { status: 400 });
    }

    const communities = await base44.asServiceRole.entities.Community.filter({ join_code: joinCode });
    if (communities.length === 0) {
      return Response.json({ error: "Community not found" }, { status: 404 });
    }

    const community = communities[0];

    const [announcements, events, boardMembers] = await Promise.all([
      base44.asServiceRole.entities.Announcement.filter({ community_id: community.id }, "-created_date"),
      base44.asServiceRole.entities.Event.filter({ community_id: community.id }, "start_time"),
      base44.asServiceRole.entities.BoardMember.filter({ community_id: community.id }),
    ]);

    return Response.json({ community, announcements, events, boardMembers });
  } catch (error) {
    console.error("get-public-community error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});