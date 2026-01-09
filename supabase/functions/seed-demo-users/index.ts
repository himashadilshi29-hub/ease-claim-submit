import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function is disabled for security reasons
// Demo user seeding should only be done through secure deployment scripts
// or manually via authenticated admin access

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Function disabled - return 403 Forbidden
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: "This function has been disabled for security reasons. Demo users should be created through secure administrative processes only." 
    }),
    { 
      status: 403, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    }
  );
});
