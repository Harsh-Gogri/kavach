"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { getCategoryById } from "../../../../lib/categories";
import { supabase } from "../../../../lib/supabase";
import SiteFooter from "../../../../components/SiteFooter";
import SiteNav from "../../../../components/SiteNav";

const fieldsByCategory = {
  fraud: [
    { name: "description", label: "Tell us what happened", type: "textarea", required: true, placeholder: "Describe how the fraud happened, in your own words" },
    { name: "amount", label: "Amount lost", type: "text", placeholder: "For example, ₹10,000" },
    { name: "transactionDate", label: "When did the transaction happen?", type: "date" },
    { name: "paymentDetails", label: "Bank, account, or UPI details", type: "text", placeholder: "Share the relevant bank or payment details" },
  ],
  hacked: [
    { name: "description", label: "Tell us what happened", type: "textarea", required: true, placeholder: "Describe the unauthorized activity" },
    { name: "platform", label: "Which platform is affected?", type: "text", required: true, placeholder: "For example, Instagram, Gmail, or WhatsApp" },
    { name: "noticedAt", label: "When did you first notice it?", type: "date" },
    { name: "accountDetails", label: "Username or recovery details", type: "text", placeholder: "Add a username or linked recovery contact" },
  ],
  harassment: [
    { name: "description", label: "Tell us what happened", type: "textarea", required: true, placeholder: "Describe the harassment, threats, or blackmail" },
    { name: "platform", label: "Where did this happen?", type: "text", required: true, placeholder: "For example, Instagram DM, WhatsApp, or email" },
    { name: "suspectDetails", label: "Suspect details, if known", type: "text", placeholder: "Username, profile link, or phone number" },
    { name: "incidentDates", label: "When did this happen?", type: "text", placeholder: "Add dates or an approximate time period" },
  ],
  other: [
    { name: "description", label: "Tell us what happened", type: "textarea", required: true, placeholder: "Describe the incident in your own words" },
    { name: "incidentDate", label: "When did this happen?", type: "date" },
    { name: "links", label: "Related links or identifiers", type: "text", placeholder: "Add any links, usernames, or phone numbers" },
  ],
};

export default function ComplaintFormPage({ params }) {
  const { category: categoryId } = use(params);
  const category = getCategoryById(categoryId);
  if (!category) notFound();

  const [submitted, setSubmitted] = useState(false);
  const [initialDescription, setInitialDescription] = useState("");
  const [acknowledgementNumber, setAcknowledgementNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fields = fieldsByCategory[category.id] || fieldsByCategory.other;

  useEffect(() => {
    const stored = sessionStorage.getItem("cyber-report-conversation");
    if (!stored) return;
    try {
      const context = JSON.parse(stored);
      if (context.category !== category.id || !Array.isArray(context.transcript)) return;
      const description = context.transcript
        .filter((turn) => turn?.role === "user")
        .map((turn) => turn.text)
        .filter(Boolean)
        .join(" ");
      setInitialDescription(description);
    } catch {
      // The form remains usable if saved conversation context is invalid.
    }
  }, [category.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    const formData = new FormData(event.currentTarget);
    const submittedAt = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const acknowledgementNumber = `30${String(submittedAt.getFullYear()).slice(-2)}${pad(submittedAt.getMonth() + 1)}${pad(submittedAt.getDate())}${pad(submittedAt.getHours())}${pad(submittedAt.getMinutes())}${pad(submittedAt.getSeconds())}`;
    setAcknowledgementNumber(acknowledgementNumber);
    const answers = fields.map((field) => ({
      label: field.label,
      value: String(formData.get(field.name) || "").trim(),
    }));
    const documents = category.documents.map((document, index) => ({
      label: document,
      fileName: formData.get(`document-${index}`)?.name || "",
    }));
    const incidentDate = String(formData.get("transactionDate") || formData.get("incidentDate") || formData.get("noticedAt") || submittedAt.toISOString());
    const amountText = String(formData.get("amount") || "").replace(/[^0-9.]/g, "");
    const amount = amountText ? Number(amountText) : null;

    const { data: complaint, error: complaintError } = await supabase
      .from("complaints")
      .insert({
        acknowledgement_number: acknowledgementNumber,
        incident_category: category.title,
        incident_subcategory: category.cardDescription,
        incident_at: incidentDate,
        submitted_at: submittedAt.toISOString(),
        current_status: "Under Process",
        status_summary: "Complaint submitted; pending verification by the assigned cyber cell.",
        assigned_state: "Maharashtra",
        assigned_district: "Pune",
        cyber_cell_station: "Pune Cyber Crime Police Station",
        investigating_officer: "Harsh Gogri",
        transaction_amount: Number.isFinite(amount) ? amount : null,
        bank_wallet_name: String(formData.get("paymentDetails") || "") || null,
        submitted_details: { answers, documents },
      })
      .select("id")
      .single();

    if (complaintError) {
      setError("We couldn't save your complaint. Please try again.");
      setSaving(false);
      return;
    }

    const { error: timelineError } = await supabase.from("complaint_timeline").insert([
      {
        complaint_id: complaint.id,
        step_number: 1,
        title: "Complaint Submitted",
        description: "Your complaint was submitted and acknowledgement number was generated.",
        occurred_at: submittedAt.toISOString(),
      },
      {
        complaint_id: complaint.id,
        step_number: 2,
        title: "Pending Verification / Assigned to Cyber Cell",
        description: "The complaint is awaiting verification. Investigating officer: Harsh Gogri.",
        occurred_at: submittedAt.toISOString(),
      },
    ]);

    if (timelineError) {
      setError("Your complaint was saved, but its timeline could not be created.");
    }
    setSaving(false);
    setSubmitted(true);
  };

  return (
    <main className="site-shell report-shell complaint-form-shell">
      <SiteNav />
      <section className="complaint-form-content" aria-labelledby="complaint-form-heading">
        <a className="summary-back" href={`/report/${category.id}`}>Back to case summary</a>
        <div className="complaint-form-intro">
          <h1 id="complaint-form-heading">{category.title}</h1>
          <p>Share what you know. You can save any supporting documents for the final step.</p>
        </div>

        {submitted ? (
          <section className="form-success" aria-live="polite">
            <h2>Details saved for this prototype</h2>
            <p>Your complaint information has been captured locally for this demo. A real submission flow will be added next.</p>
            <p className="acknowledgement-confirmation">Acknowledgement number: <strong>{acknowledgementNumber}</strong></p>
            <a className="button button-primary" href="/track">Show tracking page</a>
          </section>
        ) : (
          <form className="complaint-form" onSubmit={handleSubmit}>
            <section className="form-section" aria-labelledby="incident-details-heading">
              <h2 id="incident-details-heading">About the incident</h2>
              <div className="form-fields">
                {fields.map((field) => (
                  <div className={`form-field ${field.type === "textarea" ? "form-field-wide" : ""}`} key={field.name}>
                    <label htmlFor={field.name}>{field.label}{field.required && <span aria-hidden="true"> *</span>}</label>
                    {field.type === "textarea" ? (
                      <textarea key={`${field.name}-${initialDescription}`} id={field.name} name={field.name} rows="5" required={field.required} defaultValue={initialDescription} placeholder={field.placeholder} />
                    ) : (
                      <input id={field.name} name={field.name} type={field.type} required={field.required} placeholder={field.placeholder} />
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="form-section" aria-labelledby="evidence-heading">
              <div className="form-section-heading">
                <h2 id="evidence-heading">Documents and evidence</h2>
                <p>Add whatever you have. These uploads are visual placeholders in this prototype.</p>
              </div>
              <div className="document-upload-list">
                {category.documents.map((document, index) => (
                  <label className="document-upload-row" key={document}>
                    <span>{document}</span>
                    <input name={`document-${index}`} type="file" accept="image/*,.pdf" />
                  </label>
                ))}
              </div>
            </section>

            {category.id === "harassment" && (
              <label className="anonymous-choice">
                <input type="checkbox" name="anonymous" />
                <span>I'd prefer to file this complaint anonymously</span>
              </label>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary form-submit" type="submit" disabled={saving}>
              {saving ? "Saving complaint..." : "Submit complaint"}
            </button>
          </form>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
