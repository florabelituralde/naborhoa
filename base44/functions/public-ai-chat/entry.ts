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

    const historyText = (history || []).map(m => `${m.role === "user" ? "Resident" : "Assistant"}: ${m.content}`).join("\n");
    const prompt = `You are a friendly HOA assistant for "${community.name}", located at ${[community.address, community.city, community.state].filter(Boolean).join(", ")}. Answer the resident's question based on the uploaded community documents if they are relevant. If the documents don't cover the topic, use your general knowledge of HOA practices and community management to help. Be concise, warm, and helpful. If a question is about a specific issue that requires action, suggest they submit a request through the app.${historyText ? "\n\nConversation so far:\n" + historyText : ""}\n\nResident question: ${question}`;

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrls.length > 0 ? fileUrls : undefined,
    });

    const answer = typeof response === "string" ? response : response?.response || response?.content || "I'm sorry, I couldn't process that. Please try again.";

    return Response.json({ answer });
  } catch (error) {
    console.error("public-ai-chat error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});