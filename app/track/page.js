"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import SiteFooter from "../../components/SiteFooter";
import SiteNav from "../../components/SiteNav";

const formatDate = (value) => new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

const formatAmount = (value) => value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;

export default function TrackPage() {
  const [complaints, setComplaints] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadComplaints = async () => {
      const { data, error: queryError } = await supabase
        .from("complaints")
        .select("*, complaint_timeline(*)")
        .order("submitted_at", { ascending: false });

      if (queryError) {
        setError("We couldn't load complaint updates right now.");
      } else {
        setComplaints(data || []);
      }
      setLoading(false);
    };

    loadComplaints();
  }, []);

  const selectedComplaint = complaints.find((complaint) => complaint.id === selectedId);

  return (
    <main className="site-shell report-shell tracking-shell">
      <SiteNav />
      <section className="tracking-content" aria-labelledby="tracking-heading">
        <div className="tracking-intro">
          <a className="summary-back" href="/">Back to home</a>
          <h1 id="tracking-heading">Where your case stands</h1>
          <p>Choose a complaint to see its latest status, assigned officer, and action timeline.</p>
        </div>

        {loading && <p className="tracking-message">Loading complaint updates...</p>}
        {error && <p className="tracking-message tracking-error" role="alert">{error}</p>}
        {!loading && !error && complaints.length === 0 && <p className="tracking-message">No complaints have been submitted yet.</p>}

        {!loading && !error && complaints.length > 0 && (
          <div className="tracking-table-wrap">
            <table className="tracking-table">
              <thead>
                <tr>
                  <th scope="col">Date submitted</th>
                  <th scope="col">Acknowledgement</th>
                  <th scope="col">Category</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
            {complaints.map((complaint) => {
              const expanded = complaint.id === selectedId;
              return (
                <>
                  <tr
                    className={`tracking-row ${expanded ? "is-expanded" : ""}`}
                    tabIndex="0"
                    role="button"
                    aria-expanded={expanded}
                    onClick={() => setSelectedId(expanded ? null : complaint.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(expanded ? null : complaint.id);
                      }
                    }}
                  >
                    <td>{formatDate(complaint.submitted_at)}</td>
                    <td><strong>{complaint.acknowledgement_number}</strong></td>
                    <td>
                      <span className="table-category">{complaint.incident_category}</span>
                      <span className="table-subcategory">{complaint.incident_subcategory}</span>
                    </td>
                    <td><span className={`status-badge status-${complaint.current_status.toLowerCase().replaceAll(" ", "-")}`}>{complaint.current_status}</span></td>
                  </tr>

                  {expanded && (
                    <tr className="tracking-detail-row">
                      <td colSpan="4">
                      <div className="complaint-details">
                      <section className="tracking-block" aria-labelledby={`basic-${complaint.id}`}>
                        <h2 id={`basic-${complaint.id}`}>Basic details</h2>
                        <dl className="details-grid">
                          <div><dt>Acknowledgement number</dt><dd>{complaint.acknowledgement_number}</dd></div>
                          <div><dt>Incident date and time</dt><dd>{formatDate(complaint.incident_at)}</dd></div>
                          <div><dt>Category</dt><dd>{complaint.incident_category}</dd></div>
                          <div><dt>Sub-category</dt><dd>{complaint.incident_subcategory}</dd></div>
                          <div><dt>Assigned state / district</dt><dd>{complaint.assigned_state} / {complaint.assigned_district}</dd></div>
                          <div><dt>Cyber cell police station</dt><dd>{complaint.cyber_cell_station}</dd></div>
                          <div><dt>Investigating officer</dt><dd>{complaint.investigating_officer}</dd></div>
                        </dl>
                      </section>

                      {Array.isArray(complaint.submitted_details?.answers) && complaint.submitted_details.answers.length > 0 && (
                        <section className="tracking-block" aria-labelledby={`submitted-${complaint.id}`}>
                          <h2 id={`submitted-${complaint.id}`}>Submitted information</h2>
                          <dl className="details-grid submitted-details-grid">
                            {complaint.submitted_details.answers.filter((answer) => answer.value).map((answer) => (
                              <div className="detail-wide" key={answer.label}>
                                <dt>{answer.label}</dt>
                                <dd>{answer.value}</dd>
                              </div>
                            ))}
                          </dl>
                          {Array.isArray(complaint.submitted_details.documents) && complaint.submitted_details.documents.some((document) => document.fileName) && (
                            <div className="submitted-files">
                              <h3>Attached files</h3>
                              <ul>
                                {complaint.submitted_details.documents.filter((document) => document.fileName).map((document) => (
                                  <li key={document.label}>{document.label}: {document.fileName}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </section>
                      )}

                      {complaint.transaction_amount != null && (
                        <section className="tracking-block" aria-labelledby={`financial-${complaint.id}`}>
                          <h2 id={`financial-${complaint.id}`}>Financial breakdown</h2>
                          <dl className="details-grid">
                            <div><dt>UTR / reference number</dt><dd>{complaint.utr_reference_number || "—"}</dd></div>
                            <div><dt>Transaction amount</dt><dd>{formatAmount(complaint.transaction_amount)}</dd></div>
                            <div><dt>Bank / wallet</dt><dd>{complaint.bank_wallet_name || "—"}</dd></div>
                            <div><dt>Bank action status</dt><dd>{complaint.bank_action_status || "—"}</dd></div>
                            <div><dt>Amount saved / frozen</dt><dd>{formatAmount(complaint.amount_saved_frozen)}</dd></div>
                            <div><dt>Bank remarks</dt><dd>{complaint.bank_remarks || "—"}</dd></div>
                          </dl>
                        </section>
                      )}

                      <section className="tracking-block" aria-labelledby={`legal-${complaint.id}`}>
                        <h2 id={`legal-${complaint.id}`}>Police and legal action</h2>
                        <dl className="details-grid">
                          <div><dt>FIR number</dt><dd>{complaint.fir_number || "Not registered"}</dd></div>
                          <div><dt>FIR registration date</dt><dd>{complaint.fir_registration_date ? formatDate(complaint.fir_registration_date) : "—"}</dd></div>
                          <div className="detail-wide"><dt>Officer remarks</dt><dd>{complaint.officer_remarks || "No remarks added yet."}</dd></div>
                        </dl>
                      </section>

                      <section className="tracking-block" aria-labelledby={`timeline-${complaint.id}`}>
                        <h2 id={`timeline-${complaint.id}`}>Action timeline</h2>
                        <ol className="tracking-timeline">
                          {[...(complaint.complaint_timeline || [])].sort((a, b) => a.step_number - b.step_number).map((event) => (
                            <li key={event.id} className="timeline-event">
                              <span className="timeline-marker" aria-hidden="true">{event.step_number}</span>
                              <div>
                                <h3>{event.title}</h3>
                                <p>{event.description}</p>
                                <time dateTime={event.occurred_at}>{formatDate(event.occurred_at)}</time>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </section>
                      </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
