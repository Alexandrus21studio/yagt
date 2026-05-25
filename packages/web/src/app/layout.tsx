import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "yagt - Yet Another Git Tool",
  description: "AI-powered GitHub alternative",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <Header />
          <div style={{ display: "flex", flex: 1 }}>
            <Sidebar />
            <main
              style={{
                flex: 1,
                padding: "24px",
                overflow: "auto",
                background: "var(--bg-primary)",
              }}
            >
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
