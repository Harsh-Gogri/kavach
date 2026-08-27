"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { getCategoryById } from "../../../lib/categories";
import SiteFooter from "../../../components/SiteFooter";
import SiteNav from "../../../components/SiteNav";

export default function CategoryPage({ params }) {
  const { category: categoryId } = use(params);
  const category = getCategoryById(categoryId);
  if (!category) notFound();

  const [documents, setDocuments] = useState(category.documents);

  useEffect(() => {
    const stored = sessionStorage.getItem("cyber-report-conversation");
    if (!stored) return;

    try {
      const context = JSON.parse(stored);
      if (context.category !== category.id || !Array.isArray(context.transcript)) return;

      const text = context.transcript
        .map((turn) => (typeof turn?.text === "string" ? turn.text : ""))
        .join(" ")
        .toLowerCase();
      const has = (...terms) => terms.some((term) => text.includes(term));
      let nextDocuments = [...category.documents];

      if (category.id === "fraud" && has("upi", "यूपीआई", "युपीआय")) {
        nextDocuments = [
          "Transaction ID or UTR number",
          "Your UPI ID used in the transaction",
          "The suspect's UPI ID, phone number, or payment handle",
          "Screenshot of the UPI transaction or fraudulent message",
        ];
      }

      if (category.id === "harassment" && has("instagram", "instagram dm", "इंस्टाग्राम")) {
        nextDocuments = [
          "Screenshot of the Instagram DM conversation, including profile name and timestamps",
          "The suspect's Instagram username or profile link",
          "Any other messages, threats, or files shared in the conversation",
          "Dates and approximate times of the incidents",
        ];
      }

      if (category.id === "hacked" && has("instagram", "इंस्टाग्राम")) {
        nextDocuments = [
          "Your Instagram username and profile link",
          "Screenshot of the suspicious activity or messages sent from your account",
          "When you first noticed the unauthorized activity",
          "Any recovery email or phone number linked to the account",
        ];
      }

      setDocuments(nextDocuments);
    } catch {
      // Keep the category's safe default checklist if local context is invalid.
    }
  }, [category.id]);

  return (
    <main className="site-shell report-shell summary-shell">
      <SiteNav />

      <section className="summary-content" aria-labelledby="summary-heading">
        <a className="summary-back" href="/report">Back to report options</a>
        <h1 id="summary-heading">{category.title}</h1>
        <p className="summary-intro">{category.summary}</p>
        {category.urgent && <section className="action-box helpline-box summary-urgent" aria-label="Urgent action"><div className="action-copy"><h2>Act quickly</h2><p>Call the cyber crime helpline to report a recent financial fraud.</p></div><a className="button button-primary" href={category.urgentAction.href}>{category.urgentAction.label}</a></section>}
        <section className="documents-card" aria-labelledby="documents-heading"><h2 id="documents-heading">Documents to keep handy</h2><ul>{documents.map((document) => <li key={document}>{document}</li>)}</ul></section>
        <a className="button button-primary summary-form-link" href={`/report/${category.id}/form`}>{category.formLabel}</a>
      </section>

      <SiteFooter />
    </main>
  );
}
