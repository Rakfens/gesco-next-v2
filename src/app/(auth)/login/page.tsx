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
  goldGlowStrong: "rgba(201,169,110,0.4)",
  violet: "#8b5cf6",
  violetDim: "rgba(139,92,246,0.1)",
  bg: "#08080c",
  card: "#111114",
  card2: "#16161a",
  card3: "#1c1c22",
  border: "#1e1e24",
  border2: "#2a2a32",
  text: "#e4e4e7",
  text2: "#a1a1aa",
  muted: "#71717a",
  red: "#f87171",
  redDim: "rgba(248,113,113,0.1)",
  redBorder: "rgba(248,113,113,0.2)",
  success: "#34d399",
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
const MailIcon = ({ active }: { active?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? C.gold : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s ease" }}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const LockIcon = ({ active }: { active?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? C.gold : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.2s ease" }}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
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
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);
  const [remember, setRemember] = useState(true);

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
        background: `radial-gradient(ellipse at 50% 0%, ${C.goldDim} 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, ${C.violetDim} 0%, transparent 50%), linear-gradient(180deg, ${C.bg} 0%, #0d0d12 100%)`,
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
        <div style={{ position: "absolute", top: "10%", left: "5%", width: 300, height: 300, background: "radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 70%)", borderRadius: "50%", animation: "pulse 4s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "10%", width: 350, height: 350, background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", borderRadius: "50%", animation: "pulse 5s ease-in-out infinite 1s" }} />
        <div style={{ position: "absolute", top: "50%", left: "55%", width: 200, height: 200, background: "radial-gradient(circle, rgba(201,169,110,0.05) 0%, transparent 70%)", borderRadius: "50%", animation: "pulse 6s ease-in-out infinite 2s" }} />
        <div style={{ position: "absolute", top: "70%", right: "40%", width: 120, height: 120, background: "radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)", borderRadius: "50%", animation: "pulse 4.5s ease-in-out infinite 0.5s" }} />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 460,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          padding: "52px 40px",
          boxShadow: `0 0 100px ${C.goldGlow}, 0 25px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)`,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
          transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 100,
              height: 100,
              margin: "0 auto 24px",
              borderRadius: 24,
              overflow: "hidden",
              border: `2px solid ${C.gold}`,
              background: `linear-gradient(135deg, ${C.card2}, ${C.bg})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 32px ${C.goldGlowStrong}, inset 0 1px 0 rgba(255,255,255,0.05)`,
            }}
          >
            <img src="/logo.png" alt="HT-GesCom" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: C.text,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            HT-GesCom
          </h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
            Aterinay Services · Connexion sécurisée
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: C.redDim,
              border: `1px solid ${C.redBorder}`,
              color: C.red,
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 20,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 10,
              animation: "slideDown 0.3s ease",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 6 }}>
            Adresse email
          </label>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: emailFocused ? C.gold : C.muted, display: "flex", transition: "color 0.2s ease" }}>
              <MailIcon active={emailFocused} />
            </div>
            <input
              style={{
                width: "100%",
                padding: "14px 14px 14px 44px",
                background: C.card2,
                border: `1px solid ${emailFocused ? C.gold : C.border2}`,
                borderRadius: 12,
                color: C.text,
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
                boxShadow: emailFocused ? `0 0 0 3px ${C.goldDim}` : "none",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
              type="email"
              placeholder="admin@aterinay.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </div>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 4, marginLeft: 2 }}>
            Entrez votre adresse email professionnelle
          </p>
        </div>

        {/* Password */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, display: "block", marginBottom: 6 }}>
            Mot de passe
          </label>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: pwdFocused ? C.gold : C.muted, display: "flex", transition: "color 0.2s ease" }}>
              <LockIcon active={pwdFocused} />
            </div>
            <input
              type={showPwd ? "text" : "password"}
              style={{
                width: "100%",
                padding: "14px 48px 14px 44px",
                background: C.card2,
                border: `1px solid ${pwdFocused ? C.gold : C.border2}`,
                borderRadius: 12,
                color: C.text,
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
                boxShadow: pwdFocused ? `0 0 0 3px ${C.goldDim}` : "none",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              onFocus={() => setPwdFocused(true)}
              onBlur={() => setPwdFocused(false)}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: showPwd ? C.goldDim : "none",
                border: "none",
                color: showPwd ? C.gold : C.muted,
                cursor: "pointer",
                padding: 6,
                borderRadius: 6,
                display: "flex",
                transition: "all 0.2s ease",
              }}
            >
              {showPwd ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 4, marginLeft: 2 }}>
            8 caractères minimum recommandés
          </p>
        </div>

        {/* Remember me + Forgot password */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <div
              onClick={() => setRemember(!remember)}
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: `2px solid ${remember ? C.gold : C.border2}`,
                background: remember ? C.gold : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
            >
              {remember && <CheckIcon />}
            </div>
            <span style={{ fontSize: 12, color: C.text2 }}>Se souvenir de moi</span>
          </label>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              color: C.gold,
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            Mot de passe oublié ?
          </button>
        </div>

        {/* Submit */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "15px",
            background: loading ? C.card3 : `linear-gradient(135deg, ${C.gold}, #a68b4b)`,
            color: loading ? C.muted : "#08080c",
            border: "none",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            boxShadow: loading ? "none" : `0 6px 24px ${C.goldGlowStrong}`,
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => { if (!loading) { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${C.goldGlowStrong}`; } }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${C.goldGlowStrong}`; }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 20,
                  height: 20,
                  border: `2px solid ${C.border2}`,
                  borderTopColor: C.gold,
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

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
            HT-GesCom v3.0 · © 2024-2026 Aterinay Services
          </p>
          <p style={{ fontSize: 10, color: C.muted, marginTop: 4, opacity: 0.6 }}>
            Propulsé par <span style={{ color: C.gold }}>ZOO</span> · Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}
