import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });
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

    // Fetch the text content of HTML/text documents and embed it directly in
    // the prompt. The LLM's file-attachment parser does not reliably read
    // .html/.txt files, so this guarantees the assistant can answer from
    // FAQs and reference guides. PDFs are still passed as file_urls.
    const isTextDoc = (d: any) => {
      const ft = (d.file_type || "").toLowerCase();
      const url = (d.file_url || "").toLowerCase();
      return ft === "text/html" || ft === "text/plain" || url.endsWith(".html") || url.endsWith(".txt");
    };
    let docContentBlock = "";
    const textDocs = docs.filter(isTextDoc);
    if (textDocs.length) {
      const fetched = await Promise.all(textDocs.map(async (d: any) => {
        try {
          const r = await fetch(d.file_url);
          if (!r.ok) return null;
          let text = await r.text();
          if ((d.file_type || "").toLowerCase() === "text/html" || d.file_url.toLowerCase().endsWith(".html")) {
            text = text
              .replace(/<script[\s\S]*?<\/script>/gi, " ")
              .replace(/<style[\s\S]*?<\/style>/gi, " ")
              .replace(/<[^>]+>/g, " ")
              .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
              .replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
              .replace(/\s+/g, " ").trim();
          }
          if (!text) return null;
          return `--- ${d.title} ---\n${text}`;
        } catch (e: any) {
          console.error("public-ai-chat: failed to fetch doc content:", d.title, e?.message || e);
          return null;
        }
      }));
      const valid = fetched.filter(Boolean);
      if (valid.length) docContentBlock = `\nDocument contents (read these and use them to answer):\n${valid.join("\n\n")}\n`;
    }

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
    const communityFacts = [
      `- Community name: ${community.name}`,
      community.city && community.state ? `- Location: ${community.city}, ${community.state}` : null,
      community.monthly_dues ? `- Monthly HOA dues: $${community.monthly_dues}` : null,
    ].filter(Boolean).join("\n");

    const appGuidance = `How the visitor can do things on this community page (use this to answer "how do I..." questions — you may share this without citing documents):
    - Join the community: use the "Join" button on the community landing page and enter your address.
    - Contact the HOA: use the "Contact HOA" option on this page to send a message to the HOA admin and board.
    - Pay a dues invoice: use the "Pay Dues" option if your community has online payments enabled.`;

    const prompt = `You are the friendly HOA assistant for "${community.name}". Your job is to help residents by looking through the community's documents and answering their questions.

     ANSWERING FROM DOCUMENTS:
     - You have been given the community's documents as attached files. READ THEM. They include FAQs, quick reference guides, rules, bylaws, CC&Rs, minutes, and forms — all of them are valid sources.
     - When a document answers the question, share the answer directly and name the document it came from. Example: "According to the Community FAQ & Quick Reference Guide, pool hours are 6:00 AM to 10:00 PM daily."
     - If multiple documents address the question, share what each says.
     - Only say you don't have the information if you have genuinely checked all the documents and none of them cover it.
    ${hasDocs ? "" : "\n     (No documents have been provided by the HOA yet, so answer general questions using the community facts and page guidance below.)"}

     DO NOT:
     - Do not invent specific rules, fees, deadlines, or procedures that are not in the documents.
     - Do not invent document names or section numbers.

     WHEN THE DOCUMENTS DON'T FULLY ANSWER:
     - Share whatever related information the documents do contain, note clearly what you can and can't confirm, and end with exactly: "If you'd like more clarity, I can send this inquiry to the HOA admin for further clarification."

     GENERAL HELP (no document needed):
     - For "how do I..." questions about using this page, use the guidance below.
     - For vague/short questions (e.g. "pool", "noise", "basketball", "dues"), infer the likely intent and answer with the relevant info, then ask a quick clarifier if needed.

     Community facts (share freely):
     ${communityFacts}
     ${appGuidance}
     ${docIndex ? `\nDocuments available:\n${docIndex}\n` : ""}${docContentBlock}${contactBlock}
     ${historyText ? "Conversation so far:\n" + historyText + "\n\n" : ""}Resident question: ${question}`;

    const NO_ANSWER_TEXT = "I wasn't able to find a direct answer in the community's official documents. If you'd like more clarity, I can send this inquiry to the HOA admin for further clarification.";

    console.error("public-ai-chat: textDocs:", textDocs.length, "docContentBlock length:", docContentBlock.length, "fileUrls:", fileUrls.length);

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