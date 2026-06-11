"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { LOGIN_EMAIL, LOGIN_PASSWORD } from "@/modules/shared/utils/constants";

export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";

const C = {
  gold: "#c9a96e",
  goldDim: "rgba(201,169,110,0.1)",
  goldGlow: "rgba(201,169,110,0.25)",
  violet: "#8b5cf6",
  bg: "#08080c",
  card: "#111114",
  card2: "#16161a",
  border: "#1e1e24",
  border2: "#2a2a32",
  text: "#e4e4e7",
  text2: "#a1a1aa",
  muted: "#71717a",
  red: "#f87171",
  redDim: "rgba(248,113,113,0.1)",
  redBorder: "rgba(248,113,113,0.2)",
};

const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeClosed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(LOGIN_EMAIL);
  const [password, setPassword] = useState(LOGIN_PASSWORD);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  // Vérifier si déjà connecté → rediriger
  useEffect(() => {
    const sb = getSupabase();
    sb.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const userId = data.session.user.id;
        const { data: uc } = await sb
          .from("user_companies")
          .select("company:companies(*)")
          .eq("user_id", userId);
        const list: Array<{ type?: string }> = (uc || [])
          .map((r: { company: { type?: string }[] | { type?: string } }) =>
            Array.isArray(r.company) ? r.company[0] : r.company,
          )
          .filter(Boolean) as Array<{ type?: string }>;
        const first = list[0];
        if (first?.type === "service") {
          router.replace("/livraison/dashboard");
        } else {
          router.replace("/commerce/dashboard");
        }
      }
    });
  }, [router]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email et mot de passe requis");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const sb = getSupabase();
      const { error: authError } = await sb.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const { data: sessionData } = await sb.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (userId) {
        const { data: uc } = await sb
          .from("user_companies")
          .select("company:companies(*)")
          .eq("user_id", userId);
        const list: Array<{ type?: string }> = (uc || [])
          .map((r: { company: { type?: string }[] | { type?: string } }) =>
            Array.isArray(r.company) ? r.company[0] : r.company,
          )
          .filter(Boolean) as Array<{ type?: string }>;
        const first = list[0];
        const dest = first?.type === "service" ? "/livraison/dashboard" : "/commerce/dashboard";
        window.location.replace(dest);
      } else {
        window.location.replace("/commerce/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Identifiants incorrects";
      logger.error("[LOGIN] Error:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse at 50% 0%, ${C.goldDim} 0%, transparent 60%), linear-gradient(180deg, ${C.bg} 0%, #0d0d12 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: C.text,
      }}
    >
      {/* Particules décoratives */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "15%", left: "10%", width: 200, height: 200, background: "radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "15%", width: 250, height: 250, background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", top: "60%", left: "60%", width: 150, height: 150, background: "radial-gradient(circle, rgba(201,169,110,0.04) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 440,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: "48px 36px",
          boxShadow: `0 0 80px ${C.goldGlow}, 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)`,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0) scale(1)" : "translateY(20px) scale(0.98)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 80,
              height: 80,
              margin: "0 auto 20px",
              borderRadius: 20,
              overflow: "hidden",
              border: `2px solid ${C.gold}`,
              background: `linear-gradient(135deg, ${C.card2}, ${C.bg})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 20px ${C.goldGlow}`,
            }}
          >
            <img src="/logo.png" alt="HT-GesCom" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: C.text,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            HT-GesCom
          </h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
            Aterinay Services · Connexion
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: C.redDim,
              border: `1px solid ${C.redBorder}`,
              color: C.red,
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 16,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              animation: "slideDown 0.25s ease",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.text2,
              display: "block",
              marginBottom: 6,
            }}
          >
            Email
          </label>
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: C.muted,
                display: "flex",
              }}
            >
              <MailIcon />
            </div>
            <input
              style={{
                width: "100%",
                padding: "12px 14px 12px 42px",
                background: C.card2,
                border: `1px solid ${C.border2}`,
                borderRadius: 10,
                color: C.text,
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
              type="email"
              placeholder="admin@aterinay.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              onFocus={(e) => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldDim}`; }}
              onBlur={(e) => { e.target.style.borderColor = C.border2; e.target.style.boxShadow = "none"; }}
            />
          </div>
        </div>

        {/* Password */}
        <div style={{ marginBottom: 28 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.text2,
              display: "block",
              marginBottom: 6,
            }}
          >
            Mot de passe
          </label>
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: C.muted,
                display: "flex",
              }}
            >
              <LockIcon />
            </div>
            <input
              type={showPwd ? "text" : "password"}
              style={{
                width: "100%",
                padding: "12px 44px 12px 42px",
                background: C.card2,
                border: `1px solid ${C.border2}`,
                borderRadius: 10,
                color: C.text,
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              onFocus={(e) => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.goldDim}`; }}
              onBlur={(e) => { e.target.style.borderColor = C.border2; e.target.style.boxShadow = "none"; }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: C.muted,
                cursor: "pointer",
                padding: 4,
                display: "flex",
              }}
            >
              {showPwd ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px",
            background: `linear-gradient(135deg, ${C.gold}, #a68b4b)`,
            color: "#08080c",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "opacity 0.15s ease, transform 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: `0 4px 16px ${C.goldGlow}`,
          }}
          onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(0,0,0,0.2)",
                  borderTopColor: "#08080c",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  display: "inline-block",
                }}
              />
              Connexion en cours...
            </>
          ) : (
            "Se connecter"
          )}
        </button>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: C.muted }}>
          HT-GesCom v3.0 · © Aterinay Services
        </div>
      </div>
    </div>
  );
}
