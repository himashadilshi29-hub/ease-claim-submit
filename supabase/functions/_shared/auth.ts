import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  error?: string;
  isAdmin?: boolean;
  isBranch?: boolean;
}

/**
 * Verify the user's authentication from the Authorization header
 * Returns the user ID if authenticated, or an error response if not
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { authenticated: false, error: "Server configuration error" };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  
  // Skip verification for service role key (internal calls)
  if (token === SUPABASE_SERVICE_ROLE_KEY) {
    return { authenticated: true, isAdmin: true, isBranch: true };
  }

  // Create a client with the user's token to verify it
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { authenticated: false, error: error?.message || "Invalid or expired token" };
  }

  // Check user roles
  const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);
  const { data: roleData } = await serviceSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    authenticated: true,
    userId: user.id,
    isAdmin: roleData?.role === "admin",
    isBranch: roleData?.role === "branch",
  };
}

/**
 * Check if the user has access to a specific claim
 */
export async function verifyClaimAccess(
  userId: string,
  claimId: string,
  isAdmin: boolean = false,
  isBranch: boolean = false
): Promise<{ hasAccess: boolean; error?: string }> {
  if (isAdmin || isBranch) {
    return { hasAccess: true };
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const { data: claim, error } = await supabase
    .from("claims")
    .select("user_id")
    .eq("id", claimId)
    .maybeSingle();

  if (error) {
    return { hasAccess: false, error: "Error verifying claim access" };
  }

  if (!claim) {
    return { hasAccess: false, error: "Claim not found" };
  }

  if (claim.user_id !== userId) {
    return { hasAccess: false, error: "Access denied to this claim" };
  }

  return { hasAccess: true };
}

/**
 * Create an unauthorized response with CORS headers
 */
export function unauthorizedResponse(message: string, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Create a forbidden response with CORS headers
 */
export function forbiddenResponse(message: string, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}