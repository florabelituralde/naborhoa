import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { join_code, question, history } = body;

    if (!join_code || !question) {
      return Response.json({ error: "Missing join_code or question" }, { status: 400 });
    }

    const communities = await base44.asServiceRole.entities.Community.filter({ join_code: join_code.toUpperCase() });
    if (communities.length === 0) {
      return Response.json({ error: "Community not found" }, { status: 404 });
    }
    const community = communities[0];

    const docs = await base44.asServiceRole.entities.Document.filter({ community_id: community.id, is_public: true });
    const fileUrls = docs.map(d => d.file_url).filter(Boolean);
    const hasDocs = fileUrls.length > 0;

    const board = await base44.asServiceRole.entities.BoardMember.filter({ community_id: community.id });
    let managerEmail: string | null = null;
    if (community.created_by_id) {
      try {
        const managers = await base44.asServiceRole.entities.User.filter({ id: community.created_by_id });
        managerEmail = managers?.[0]?.email || null;
      } catch (e) {
        console.error("public-ai-chat: failed to load manager:", e);
      }
    }

    const contactLines: string[] = [];
    if (managerEmail) contactLines.push(`- HOA Admin: ${managerEmail}`);
    board.filter(b => b.email).forEach(b => {
      const roleLabel = b.role ? ` (${b.role.replace(/_/g, " ")})` : "";
      contactLines.push(`- Board member: ${b.name}${roleLabel} — ${b.email}`);
    });
    const contactBlock = contactLines.length
      ? `\nHOA contact details (share these when asked how to reach the HOA or board; do not invent contact info not listed here):\n${contactLines.join("\n")}\n`
      : "";

    const historyText = (history || []).map(m => `${m.role === "user" ? "Resident" : "Assistant"}: ${m.content}`).join("\n");
    const prompt = `You are the HOA assistant for the community "${community.name}". You must follow these rules strictly:
1. ONLY answer questions about this community's rules, policies, dues, or procedures using information found in the official HOA documents provided to you${hasDocs ? "" : " (note: no documents have been provided by the HOA yet)"}.
2. NEVER invent, assume, guess, or use outside/general knowledge to state a policy, rule, fee, deadline, or procedure. If the documents do not clearly state it, you do not know it.
3. If the answer is not clearly stated in the provided documents, respond exactly with: "I don't have that information in the community's official documents. Please contact your HOA board for an answer." Do not add a made-up answer before or after this.
4. When you do answer from a document, base it only on what the document says.
5. You may help with general, non-policy tasks (e.g. suggest submitting a request) without documents.
6. Be concise, warm, and helpful.
${contactBlock}
${historyText ? "Conversation so far:\n" + historyText + "\n\n" : ""}Resident question: ${question}`;

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: hasDocs ? fileUrls : undefined,
    });

    const answer = typeof response === "string" ? response : response?.response || response?.content || "I'm sorry, I couldn't process that. Please try again.";

    return Response.json({ answer });
  } catch (error) {
    console.error("public-ai-chat error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});