import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "yagt",
  description: "AI-powered GitHub client",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="gh-dark">
      <body style={{ background: "#0d1117", color: "#e6edf3", minHeight: "100vh" }}>
        <Providers>
          <Header />
          <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
