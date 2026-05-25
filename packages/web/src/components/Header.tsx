"use client";

import { Search, Bell, Plus, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 24px",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-color)",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <Link
          href="/"
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--text-primary)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "28px",
              height: "28px",
              background: "var(--accent)",
              borderRadius: "6px",
              textAlign: "center",
              lineHeight: "28px",
              color: "#fff",
              fontSize: "14px",
            }}
          >
            Y
          </span>
          yagt
        </Link>
      </div>

      <div
        style={{
          flex: 1,
          maxWidth: "500px",
          position: "relative",
        }}
      >
        <Search
          size={16}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-secondary)",
          }}
        />
        <input
          type="text"
          placeholder="Search repositories, issues, PRs..."
          style={{
            width: "100%",
            paddingLeft: "36px",
            background: "var(--bg-primary)",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {status === "authenticated" && session?.user ? (
          <>
            <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}>
              <Plus size={16} />
              <span className="hide-sm">New</span>
            </button>
            <button style={{ position: "relative", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={18} />
              <span style={{ position: "absolute", top: "2px", right: "2px", width: "8px", height: "8px", background: "var(--accent)", borderRadius: "50%" }} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => signOut()} title="Sign out">
              {session.user.image ? (
                <img src={session.user.image} alt={session.user.name || "User"} style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "14px", color: "#fff" }}>
                  {(session.user.name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                {session.user.name || session.user.email || "User"}
              </span>
              <LogOut size={14} style={{ color: "var(--text-secondary)" }} />
            </div>
          </>
        ) : (
          <button onClick={() => signIn("github")} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px" }}>
            <LogIn size={16} />
            Sign in with GitHub
          </button>
        )}
      </div>
    </header>
  );
}
