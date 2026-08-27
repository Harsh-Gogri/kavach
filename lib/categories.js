export const categories = [
  {
    id: "fraud",
    title: "Money lost to fraud",
    cardDescription: "UPI, bank transfer, card, or a fake investment",
    urgent: true,
    summary: "This looks like a financial fraud case. If this happened recently, acting fast improves the chance your bank can still reverse the transaction.",
    urgentAction: { label: "Call 1930 now", href: "tel:1930" },
    documents: ["Transaction ID or UTR number", "Name of your bank and the account or UPI ID used", "Amount lost, and the date and time of the transaction", "Screenshot of the transaction or the fraudulent message"],
    formLabel: "Continue to file a complaint",
  },
  {
    id: "hacked",
    title: "Account hacked or misused",
    cardDescription: "Social media, email, or your identity",
    urgent: false,
    summary: "This looks like an account compromise. Gathering the details below will help you file a complaint that gets acted on faster.",
    documents: ["Which platform is affected (e.g. Instagram, Gmail, WhatsApp)", "When you first noticed the unauthorized activity", "Screenshot of the suspicious activity or messages sent from your account", "Any recovery email or phone number linked to the account"],
    formLabel: "Continue to file a complaint",
  },
  {
    id: "harassment",
    title: "Harassment, blackmail, or threats",
    cardDescription: "Cyberstalking, exploitation, or blackmail",
    urgent: false,
    summary: "This is a sensitive category, and you can choose to file this complaint anonymously if you prefer.",
    documents: ["Screenshots or chat logs of the harassment", "The suspect's profile, username, or phone number, if known", "The platform where this occurred", "Dates of the incidents"],
    formLabel: "Continue to file a complaint",
  },
  {
    id: "other",
    title: "Something else",
    cardDescription: "Hacking, a scam, or anything not listed above",
    urgent: false,
    summary: "Tell us a bit more so we can point you to the right next step.",
    documents: ["A brief written description of what happened", "Any screenshots, links, or messages related to the incident"],
    formLabel: "Continue to file a complaint",
  },
];

export function getCategoryById(id) {
  return categories.find((category) => category.id === id);
}
