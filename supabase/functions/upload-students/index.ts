import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface StudentRecord {
  index_number: string;
  full_name: string;
  organization: string;
  issued_at: string;
  expires_at: string;
  photo_url?: string;
  status?: "pending" | "verified" | "rejected" | "expired";
}

interface UploadRequest {
  institution_id: string;
  records: StudentRecord[];
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key from header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key. Provide x-api-key header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key against institution
    // For now, we'll use a simple check - in production, you'd have an api_keys table
    const institutionId = apiKey; // Using institution_id as API key for simplicity

    const { data: institution, error: instError } = await supabase
      .from("institutions")
      .select("id, name")
      .eq("id", institutionId)
      .maybeSingle();

    if (instError || !institution) {
      console.error("Institution validation error:", instError);
      return new Response(
        JSON.stringify({ error: "Invalid API key or institution not found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: UploadRequest = await req.json();

    if (!body.records || !Array.isArray(body.records)) {
      return new Response(
        JSON.stringify({ error: "Invalid request. Expected 'records' array." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.records.length === 0) {
      return new Response(
        JSON.stringify({ error: "No records provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.records.length > 500) {
      return new Response(
        JSON.stringify({ error: "Maximum 500 records per request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${body.records.length} records for institution ${institution.name}`);

    // Validate and transform records
    const validRecords: any[] = [];
    const errors: Array<{ index: number; message: string }> = [];

    body.records.forEach((record, index) => {
      // Validate required fields
      if (!record.index_number?.trim()) {
        errors.push({ index, message: "Missing index_number" });
        return;
      }
      if (!record.full_name?.trim()) {
        errors.push({ index, message: "Missing full_name" });
        return;
      }
      if (!record.organization?.trim()) {
        errors.push({ index, message: "Missing organization" });
        return;
      }
      if (!record.issued_at) {
        errors.push({ index, message: "Missing issued_at" });
        return;
      }
      if (!record.expires_at) {
        errors.push({ index, message: "Missing expires_at" });
        return;
      }

      // Validate status
      const validStatuses = ["pending", "verified", "rejected", "expired"];
      const status = record.status && validStatuses.includes(record.status) 
        ? record.status 
        : "verified";

      validRecords.push({
        index_number: record.index_number.trim().toUpperCase(),
        full_name: record.full_name.trim(),
        organization: record.organization.trim(),
        issued_at: record.issued_at,
        expires_at: record.expires_at,
        photo_url: record.photo_url || null,
        status,
        institution_id: institution.id,
      });
    });

    if (validRecords.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No valid records to insert",
          errors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert records
    const { data: insertedData, error: insertError } = await supabase
      .from("index_records")
      .insert(validRecords)
      .select("id, index_number");

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to insert records",
          error: insertError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully inserted ${insertedData?.length || 0} records`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully uploaded ${insertedData?.length || 0} records`,
        inserted: insertedData?.length || 0,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in upload-students function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
