import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", weight: ["400", "500", "600", "700"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Handyman Services in Columbus: home and commercial repairs in central Ohio",
  description:
    "Plumbing, electrical, drywall and painting for homes, offices and commercial sites in Franklin County and six more Ohio counties. Insured crew, emergencies 24 hours a day.",
  metadataBase: new URL("https://handyman-columbus-3d-punctum.vercel.app"),
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Handyman Services in Columbus",
    description: "One insured crew for plumbing, electrical, drywall, wood and commercial maintenance across central Ohio.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Photo scanned hand tools knolled on a plywood workbench" }],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#e9e6df", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] btn btn-primary button-sm">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
