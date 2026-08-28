"use client";

import { useEffect, useState } from "react";

import SiteFooter from "../../components/SiteFooter";
import SiteNav from "../../components/SiteNav";

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatAmount = (value) => (value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`);
const RECENT_ACKS_KEY = "cyber-report-recent-acknowledgements";

export default function TrackPage() {
  const [acknowledgementNumber, setAcknowledgementNumber] = useState("");
  const [recentNumbers, setRecentNumbers] = useState([]);
  const [complaint, setComplaint] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_ACKS_KEY) || "[]");
      if (Array.isArray(stored)) setRecentNumbers(stored.filter(Boolean).slice(0, 3));
    } catch {
      // Recent numbers are only a convenience; lookup remains usable without them.
    }
  }, []);

  const lookupComplaint = async (event) => {
    event.preventDefault();
    const number = acknowledgementNumber.trim();
    setSearched(true);
    setComplaint(null);
    setError("");
    if (!number) return;

    setLoading(true);
    const response = await fetch(`/api/complaints?acknowledgementNumber=${encodeURIComponent(number)}`);
    const result = await response.json();
    if (!response.ok) setError(result.error || "We couldn't check that number right now. Please try again.");
    else setComplaint(result.complaint || null);
    setLoading(false);
  };

  const selectedComplaint = complaint;

  return (
    <main className="site-shell report-shell tracking-shell">
      <SiteNav />
      <section className="tracking-content" aria-labelledby="tracking-heading">
        <div className="tracking-intro">
          <a className="summary-back" href="/">
            Back to home
          </a>
          <h1 id="tracking-heading">Track your complaint</h1>
          <p>Enter your acknowledgement number to check the current status.</p>
        </div>

        <form className="tracking-lookup" onSubmit={lookupComplaint}>
          <label htmlFor="acknowledgement-number">Acknowledgement number</label>
          <div className="tracking-lookup-row">
            <input id="acknowledgement-number" value={acknowledgementNumber} onChange={(event) => setAcknowledgementNumber(event.target.value)} inputMode="numeric" autoComplete="off" placeholder="Example: 30202608271001" />
            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? "Checking..." : "Check status"}
            </button>
          </div>
          {recentNumbers.length > 0 && (
            <div className="tracking-suggestions" aria-label="Recent acknowledgement numbers">
              <span>Recent numbers</span>
              {recentNumbers.map((number) => (
                <button key={number} type="button" onClick={() => setAcknowledgementNumber(number)}>
                  {number}
                </button>
              ))}
            </div>
          )}
        </form>

        {error && (
          <p className="tracking-message tracking-error" role="alert">
            {error}
          </p>
        )}
        {searched && !loading && !error && !selectedComplaint && acknowledgementNumber.trim() && <p className="tracking-message">No complaint found for that acknowledgement number.</p>}
        {selectedComplaint && (
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
                <tr className="tracking-row is-expanded">
                  <td>{formatDate(selectedComplaint.submitted_at)}</td>
                  <td>
                    <strong>{selectedComplaint.acknowledgement_number}</strong>
                  </td>
                  <td>
                    <span className="table-category">{selectedComplaint.incident_category}</span>
                    <span className="table-subcategory">{selectedComplaint.incident_subcategory}</span>
                  </td>
                  <td>
                    <span className={`status-badge status-${selectedComplaint.current_status.toLowerCase().replaceAll(" ", "-")}`}>{selectedComplaint.current_status}</span>
                  </td>
                </tr>
                <tr className="tracking-detail-row">
                  <td colSpan="4">
                    <div className="complaint-details">
                      <section className="tracking-block" aria-labelledby="basic-details-heading">
                        <h2 id="basic-details-heading">Basic details</h2>
                        <dl className="details-grid">
                          <div>
                            <dt>Acknowledgement number</dt>
                            <dd>{selectedComplaint.acknowledgement_number}</dd>
                          </div>
                          <div>
                            <dt>Incident date and time</dt>
                            <dd>{formatDate(selectedComplaint.incident_at)}</dd>
                          </div>
                          <div>
                            <dt>Category</dt>
                            <dd>{selectedComplaint.incident_category}</dd>
                          </div>
                          <div>
                            <dt>Sub-category</dt>
                            <dd>{selectedComplaint.incident_subcategory}</dd>
                          </div>
                          <div>
                            <dt>Assigned state / district</dt>
                            <dd>
                              {selectedComplaint.assigned_state} / {selectedComplaint.assigned_district}
                            </dd>
                          </div>
                          <div>
                            <dt>Cyber cell police station</dt>
                            <dd>{selectedComplaint.cyber_cell_station}</dd>
                          </div>
                          <div>
                            <dt>Investigating officer</dt>
                            <dd>{selectedComplaint.investigating_officer}</dd>
                          </div>
                        </dl>
                      </section>

                      {Array.isArray(selectedComplaint.submitted_details?.answers) && selectedComplaint.submitted_details.answers.length > 0 && (
                        <section className="tracking-block" aria-labelledby="submitted-details-heading">
                          <h2 id="submitted-details-heading">Submitted information</h2>
                          <dl className="details-grid submitted-details-grid">
                            {selectedComplaint.submitted_details.answers
                              .filter((answer) => answer.value)
                              .map((answer) => (
                                <div className="detail-wide" key={answer.label}>
                                  <dt>{answer.label}</dt>
                                  <dd>{answer.value}</dd>
                                </div>
                              ))}
                          </dl>
                          {Array.isArray(selectedComplaint.submitted_details.documents) && selectedComplaint.submitted_details.documents.some((document) => document.fileName) && (
                            <div className="submitted-files">
                              <h3>Attached files</h3>
                              <ul>
                                {selectedComplaint.submitted_details.documents
                                  .filter((document) => document.fileName)
                                  .map((document) => (
                                    <li key={document.label}>
                                      {document.label}: {document.fileName}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}
                        </section>
                      )}

                      {selectedComplaint.transaction_amount != null && (
                        <section className="tracking-block" aria-labelledby="financial-details-heading">
                          <h2 id="financial-details-heading">Financial breakdown</h2>
                          <dl className="details-grid">
                            <div>
                              <dt>UTR / reference number</dt>
                              <dd>{selectedComplaint.utr_reference_number || "—"}</dd>
                            </div>
                            <div>
                              <dt>Transaction amount</dt>
                              <dd>{formatAmount(selectedComplaint.transaction_amount)}</dd>
                            </div>
                            <div>
                              <dt>Bank / wallet</dt>
                              <dd>{selectedComplaint.bank_wallet_name || "—"}</dd>
                            </div>
                            <div>
                              <dt>Bank action status</dt>
                              <dd>{selectedComplaint.bank_action_status || "—"}</dd>
                            </div>
                            <div>
                              <dt>Amount saved / frozen</dt>
                              <dd>{formatAmount(selectedComplaint.amount_saved_frozen)}</dd>
                            </div>
                            <div>
                              <dt>Bank remarks</dt>
                              <dd>{selectedComplaint.bank_remarks || "—"}</dd>
                            </div>
                          </dl>
                        </section>
                      )}

                      <section className="tracking-block" aria-labelledby="legal-details-heading">
                        <h2 id="legal-details-heading">Police and legal action</h2>
                        <dl className="details-grid">
                          <div>
                            <dt>FIR number</dt>
                            <dd>{selectedComplaint.fir_number || "Not registered"}</dd>
                          </div>
                          <div>
                            <dt>FIR registration date</dt>
                            <dd>{selectedComplaint.fir_registration_date ? formatDate(selectedComplaint.fir_registration_date) : "—"}</dd>
                          </div>
                          <div className="detail-wide">
                            <dt>Officer remarks</dt>
                            <dd>{selectedComplaint.officer_remarks || "No remarks added yet."}</dd>
                          </div>
                        </dl>
                      </section>

                      <section className="tracking-block" aria-labelledby="timeline-heading">
                        <h2 id="timeline-heading">Action timeline</h2>
                        <ol className="tracking-timeline">
                          {[...(selectedComplaint.complaint_timeline || [])]
                            .sort((a, b) => a.step_number - b.step_number)
                            .map((event) => (
                              <li key={event.id} className="timeline-event">
                                <span className="timeline-marker" aria-hidden="true">
                                  {event.step_number}
                                </span>
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
              </tbody>
            </table>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
