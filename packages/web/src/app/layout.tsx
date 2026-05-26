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
      <body className="bg-base-100 min-h-screen text-base-content">
        <Providers>
          <Header />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
