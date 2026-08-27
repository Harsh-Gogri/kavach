import "./globals.css";
import AuthGate from "../components/AuthGate";

export const metadata = {
  title: "Cyber Crime Reporting",
  description: "A citizen-facing cyber crime reporting prototype.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><AuthGate>{children}</AuthGate></body>
    </html>
  );
}
