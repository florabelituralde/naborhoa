// Standalone integration function invoked by the frontend shim
// (`base44.integrations.Core.InvokeLLM` -> supabase.functions.invoke('invoke-llm')).
// Returns the LLM result directly as the response body so the caller receives a
// string (plain prompt) or an object (when a JSON schema was requested), matching
// Base44's InvokeLLM contract.
import { withCors } from "../_shared/cors.ts";
import { invokeLLM } from "../_shared/integrations.ts";

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await invokeLLM(body);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}));
