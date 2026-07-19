// Standalone integration function invoked by the frontend shim
// (`base44.integrations.Core.SendEmail` -> supabase.functions.invoke('send-email')).
import { withCors } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/integrations.ts";

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await sendEmail(body);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}));
