// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: uc } = await supabase.from("user_companies").select("company:companies(*)").eq("user_id", user.id).limit(1);
        const company = uc?.[0]?.company;
        router.push(company?.type === "service" ? "/livraison/dashboard" : "/commerce/dashboard");
      } else {
        router.push("/commerce/dashboard");
      }
    } catch {
      router.push("/commerce/dashboard");
    }
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #f8f9fc 0%, #eef0f6 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "40px 32px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: 16, background: "#eef2ff", border: "1px solid #c7d2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#4f46e5" }}>HT</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>HT-GesCom</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Aterinay Services · Connexion</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            <span>{error}</span>
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Email</label>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", display: "flex" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            </div>
            <input
              type="email"
              placeholder="admin@aterinay.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
              required
              autoComplete="email"
              style={{ width: "100%", padding: "11px 14px 11px 40px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 10, color: "#111827", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Mot de passe</label>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", display: "flex" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <input
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
              required
              autoComplete="current-password"
              style={{ width: "100%", padding: "11px 44px 11px 40px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 10, color: "#111827", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: 4, display: "flex" }}>
              {showPwd ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "12px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
          }}
        >
          {loading ? (
            <>
              <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
              Connexion en cours...
            </>
          ) : "Se connecter"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#9ca3af" }}>
          HT-GesCom v3.0 · © Aterinay Services
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
