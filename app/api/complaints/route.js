import { createClient } from "@supabase/supabase-js";

const allowedCategories = new Set(["Money lost to fraud", "Account hacked or misused", "Harassment, blackmail, or threats", "Something else"]);
const acknowledgementPattern = /^30[0-9]{12}$/;

const getAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
};

const json = (body, status = 200) => Response.json(body, { status });
const cleanText = (value, max = 2000) => String(value || "").trim().slice(0, max);
const publicFields = "id, acknowledgement_number, incident_category, incident_subcategory, incident_at, submitted_at, current_status, status_summary, assigned_state, assigned_district, cyber_cell_station, investigating_officer, transaction_amount, utr_reference_number, bank_wallet_name, bank_action_status, amount_saved_frozen, bank_remarks, fir_number, fir_registration_date, officer_remarks, submitted_details, complaint_timeline(id, step_number, title, description, occurred_at)";

export async function GET(request) {
  const number = cleanText(new URL(request.url).searchParams.get("acknowledgementNumber"), 32);
  if (!acknowledgementPattern.test(number)) return json({ error: "Invalid acknowledgement number" }, 400);

  try {
    const { data, error } = await getAdminClient().from("complaints").select(publicFields).eq("acknowledgement_number", number).maybeSingle();
    if (error) {
      console.error("Complaint lookup failed:", error);
      return json({ error: "Unable to check the acknowledgement number" }, 500);
    }
    return json({ complaint: data || null });
  } catch (error) {
    console.error("Complaint lookup failed:", error);
    return json({ error: "Unable to check the acknowledgement number" }, 500);
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const acknowledgementNumber = cleanText(payload.acknowledgementNumber, 32);
    const incidentCategory = cleanText(payload.incidentCategory, 100);
    const incidentSubcategory = cleanText(payload.incidentSubcategory, 180);
    if (!acknowledgementPattern.test(acknowledgementNumber) || !allowedCategories.has(incidentCategory) || !incidentSubcategory) return json({ error: "Invalid complaint details" }, 400);

    const submittedAt = cleanText(payload.submittedAt, 40) || new Date().toISOString();
    const incidentAt = cleanText(payload.incidentAt, 40) || submittedAt;
    const submittedDetails = payload.submittedDetails && typeof payload.submittedDetails === "object" ? payload.submittedDetails : { answers: [], documents: [] };
    if (JSON.stringify(submittedDetails).length > 20000) return json({ error: "Complaint details are too large" }, 413);
    const admin = getAdminClient();
    const { data: complaint, error: complaintError } = await admin.from("complaints").insert({
      acknowledgement_number: acknowledgementNumber,
      incident_category: incidentCategory,
      incident_subcategory: incidentSubcategory,
      incident_at: incidentAt,
      submitted_at: submittedAt,
      current_status: "Under Process",
      status_summary: "Complaint submitted; pending verification by the assigned cyber cell.",
      assigned_state: "Maharashtra",
      assigned_district: "Pune",
      cyber_cell_station: "Pune Cyber Crime Police Station",
      investigating_officer: "Harsh Gogri",
      transaction_amount: Number.isFinite(Number(payload.transactionAmount)) ? Number(payload.transactionAmount) : null,
      bank_wallet_name: cleanText(payload.bankWalletName, 200) || null,
      submitted_details: submittedDetails,
    }).select("id, acknowledgement_number").single();

    if (complaintError) {
      console.error("Complaint insert failed:", complaintError);
      return json({ error: "We couldn't save your complaint" }, 500);
    }

    const { error: timelineError } = await admin.from("complaint_timeline").insert([
      { complaint_id: complaint.id, step_number: 1, title: "Complaint Submitted", description: "Your complaint was submitted and acknowledgement number was generated.", occurred_at: submittedAt },
      { complaint_id: complaint.id, step_number: 2, title: "Pending Verification / Assigned to Cyber Cell", description: "The complaint is awaiting verification. Investigating officer: Harsh Gogri.", occurred_at: submittedAt },
    ]);
    if (timelineError) console.error("Complaint timeline insert failed:", timelineError);
    return json({ complaint, timelineSaved: !timelineError }, 201);
  } catch (error) {
    console.error("Complaint submission failed:", error);
    return json({ error: "We couldn't save your complaint" }, 500);
  }
}