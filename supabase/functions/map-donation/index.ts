import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: roles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roles) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit: 10 requests per 5 minutes
    const { data: rateLimitOk, error: rateLimitError } = await supabaseClient
      .rpc('check_rate_limit', {
        _user_id: user.id,
        _function_name: 'map-donation',
        _max_requests: 10,
        _window_minutes: 5
      });

    if (rateLimitError || !rateLimitOk) {
      console.warn('Rate limit exceeded for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Rate limit check passed for user:', user.id);

    const { donationId } = await req.json();

    // Get donation details
    const { data: donation, error: donationError } = await supabaseClient
      .from("donations")
      .select("medicine_name, description")
      .eq("id", donationId)
      .single();

    if (donationError) throw donationError;

    // Get all NGOs
    const { data: ngos, error: ngosError } = await supabaseClient
      .from("ngos")
      .select("id, description, requirements");

    if (ngosError) throw ngosError;

    if (!ngos || ngos.length === 0) {
      return new Response(
        JSON.stringify({ message: "No NGOs found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simple text matching algorithm
    const donationText = `${donation.medicine_name} ${donation.description || ""}`.toLowerCase();
    
    const mappings = ngos.map((ngo) => {
      const ngoText = `${ngo.description || ""} ${ngo.requirements || ""}`.toLowerCase();
      
      // Calculate similarity score based on word overlap
      const donationWords = donationText.split(/\s+/).filter(w => w.length > 3);
      const ngoWords = ngoText.split(/\s+/).filter(w => w.length > 3);
      
      const commonWords = donationWords.filter(word => ngoWords.includes(word));
      const score = Math.min(100, (commonWords.length / Math.max(donationWords.length, 1)) * 100);
      
      return {
        ngo_id: ngo.id,
        score: Math.round(score * 100) / 100
      };
    });

    // Sort by score and get top matches
    const topMatches = mappings
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Store mappings
    if (topMatches.length > 0) {
      const mappingRecords = topMatches.map(match => ({
        donation_id: donationId,
        ngo_id: match.ngo_id,
        similarity_score: match.score
      }));

      const { error: insertError } = await supabaseClient
        .from("mappings")
        .insert(mappingRecords);

      if (insertError) {
        console.error("Error inserting mappings:", insertError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        matches: topMatches.length,
        topMatch: topMatches[0] || null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
