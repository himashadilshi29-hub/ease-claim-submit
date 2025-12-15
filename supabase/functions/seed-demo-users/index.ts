import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_USERS = [
  {
    email: "customer@insurance.lk",
    password: "customer123",
    full_name: "Demo Customer",
    portal: "customer",
    nic: "199012345678",
  },
  {
    email: "staff@insurance.lk", 
    password: "staff123",
    full_name: "Demo Staff",
    portal: "branch",
    nic: "198512345678",
  },
  {
    email: "admin@insurance.lk",
    password: "admin123", 
    full_name: "Demo Admin",
    portal: "admin",
    nic: "198012345678",
  },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results = [];

    for (const user of DEMO_USERS) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const userExists = existingUsers?.users?.some(u => u.email === user.email);

      if (userExists) {
        console.log(`User ${user.email} already exists, skipping...`);
        results.push({ email: user.email, status: "already_exists" });
        continue;
      }

      // Create user with admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          portal: user.portal,
          nic: user.nic,
        },
      });

      if (error) {
        console.error(`Error creating user ${user.email}:`, error);
        results.push({ email: user.email, status: "error", error: error.message });
      } else {
        console.log(`Created user ${user.email} successfully`);
        results.push({ email: user.email, status: "created", userId: data.user?.id });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error: any) {
    console.error("Error in seed-demo-users:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
