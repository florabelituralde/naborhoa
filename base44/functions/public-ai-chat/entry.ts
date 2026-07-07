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

    // The AI assistant is a paid feature (Connected/Portfolio plans) or
    // during the 14-day free trial. Communities on Free/Starter/Growth (or
    // whose trial has expired) do not get the public AI assistant.
    const AI_PLANS = ["pro", "pro_multi"];
    const TRIAL_DAYS = 14;
    function aiAvailable(c) {
      // Free trial (no plan yet) => full access, same as the in-app gate.
      if (!c.plan_id) {
        if (c.subscription_status === "ended") return false;
        const created = c.created_date ? new Date(c.created_date) : null;
        if (!created || isNaN(created.getTime())) return false;
        const trialEnd = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        return Date.now() < trialEnd.getTime();
      }
      // Paid plan: only active or canceled (paid-for-current-period) unlocks it.
      // "pending" means checkout started but not paid => locked, consistent with
      // the in-app hasModule gate so public + in-app access always match.
      if (c.subscription_status !== "active" && c.subscription_status !== "canceled") return false;
      return AI_PLANS.includes(c.plan_id);
    }
    if (!aiAvailable(community)) {
      return Response.json({ unavailable: true });
    }

    const docs = await base44.asServiceRole.entities.Document.filter({ community_id: community.id, is_public: true });
    const fileUrls = docs.map(d => d.file_url).filter(Boolean);
    const hasDocs = fileUrls.length > 0;
    const docIndex = docs.length
      ? docs.map((d, i) => `${i + 1}. ${d.title}${d.category ? ` (${d.category})` : ""}`).join("\n")
      : "";

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
    const boardEmails = board.map(b => b.email).filter(Boolean);
    const primaryContact = managerEmail || boardEmails[0] || null;

    const historyText = (history || []).map(m => `${m.role === "user" ? "Resident" : "Assistant"}: ${m.content}`).join("\n");
    const prompt = `You are the HOA assistant for the community "${community.name}". You must follow these rules strictly:
1. ONLY answer questions about this community's rules, policies, dues, or procedures using information found in the official HOA documents provided to you${hasDocs ? "" : " (note: no documents have been provided by the HOA yet)"}.
2. NEVER invent, assume, guess, or use outside/general knowledge to state a policy, rule, fee, deadline, or procedure. If the documents do not clearly state it, you do not know it. Never invent document names or section numbers that do not appear in the provided documents.
3. Search ALL of the provided documents before answering. When you find the answer, cite the source: name the document title and the section (if identifiable), then quote the exact wording from that section, then give a brief plain-language interpretation that does not extend or change the original meaning. Example: "According to the <Document Title>, <Section>: \"<exact quoted text>\". In other words, <interpretation>."
4. If the answer is not clearly stated in any provided document, or you cannot point to a specific document and section that states it, respond exactly with: "I don't have that information in the community's official documents. Please contact your HOA board for an answer." Do not add a made-up answer, a guessed section, or general HOA advice before or after this.
5. You may help with general, non-policy tasks (e.g. suggest submitting a request) without citing documents.
6. Be concise, warm, and helpful.
${docIndex ? `\nHOA documents available (cite by these titles only):\n${docIndex}\n` : ""}${contactBlock}
${historyText ? "Conversation so far:\n" + historyText + "\n\n" : ""}Resident question: ${question}`;

    const NO_ANSWER_TEXT = "I don't have that information in the community's official documents. Please contact your HOA board for an answer.";

    // A single broken/unreadable uploaded document can fail the entire LLM
    // call. Try with all files first; if that fails, retry with only the
    // app-hosted files (uploaded via the app and most likely valid) so the
    // assistant can still quote from the good documents. If that also fails,
    // fall back to the no-answer response so the contact fallback triggers.
    let response;
    try {
      response = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        file_urls: hasDocs ? fileUrls : undefined,
      });
    } catch (fileErr) {
      console.error("public-ai-chat: LLM call with all files failed, retrying with hosted-only files:", fileErr?.message || fileErr);
      const hostedUrls = fileUrls.filter(u => u && u.includes("base44.app"));
      if (hostedUrls.length) {
        try {
          response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            file_urls: hostedUrls,
          });
        } catch (e2) {
          console.error("public-ai-chat: hosted-only retry failed:", e2?.message || e2);
        }
      }
    }

    const answer = response
      ? (typeof response === "string" ? response : response?.response || response?.content || NO_ANSWER_TEXT)
      : NO_ANSWER_TEXT;

    return Response.json({ answer, contact: { hoaEmail: primaryContact }, communityName: community.name });
  } catch (error) {
    console.error("public-ai-chat error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});