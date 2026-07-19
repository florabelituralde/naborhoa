// Standalone integration function invoked by the frontend shim
// (`base44.integrations.Core.ExtractDataFromUploadedFile`
//  -> supabase.functions.invoke('extract-data')). Returns { output }.
import { withCors } from "../_shared/cors.ts";
import { extractData } from "../_shared/integrations.ts";

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await extractData(body);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}));
