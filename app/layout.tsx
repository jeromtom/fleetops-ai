import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FleetOps AI — Google ADK Fleet for GCP Compliance",
  description:
    "3-agent Google ADK fleet (Scanner + Policy + Remediation) that autonomously audits Google Cloud for cost, security, and compliance drift. Built for the All Things Agentic Hackathon.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
