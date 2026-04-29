"use client";

import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import RegisterScreen from "@/components/RegisterScreen";
import HomeScreen from "@/components/HomeScreen";
import OnboardingScreen from "@/components/OnboardingScreen";
import { supabase } from "@/lib/supabase";

type Screen = "onboarding" | "checking" | "login" | "register" | "home";

export default function LoginPage() {
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // If returning from OAuth redirect, skip onboarding and check session
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes("access_token") || search.includes("code=")) {
      checkSession();
    }
  }, []);

  async function checkSession() {
    setScreen("checking");
    const { data } = await supabase.auth.getSession();
    setScreen(data.session ? "home" : "login");
  }

  async function handleLogin() {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("E-mail ou senha incorretos.");
    else setScreen("home");
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setOauthLoading("google");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    setOauthLoading(null);
  }

  async function handleAppleLogin() {
    setOauthLoading("apple");
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: window.location.origin },
    });
    setOauthLoading(null);
  }

  if (screen === "onboarding") return <OnboardingScreen onDone={checkSession} />;

  if (screen === "checking") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--p)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (screen === "register") return <RegisterScreen onBack={() => setScreen("login")} onDone={() => setScreen("home")} />;
  if (screen === "home") return <HomeScreen onSignOut={() => setScreen("onboarding")} />;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px 40px" }}>
      <div style={{ width: "100%", maxWidth: 430 }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 220, paddingLeft: 56 }}>
          <Logo />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <input className="inp" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="inp" type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
        </div>

        {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

        <button className="btn-primary" style={{ marginBottom: 20, opacity: loading ? 0.7 : 1 }} onClick={handleLogin} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ height: 0.5, background: "var(--bd)", flex: 1 }} />
          <span style={{ fontSize: 11, color: "var(--mt)" }}>ou continue com</span>
          <div style={{ height: 0.5, background: "var(--bd)", flex: 1 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          <button className="btn-social" onClick={handleAppleLogin} disabled={oauthLoading !== null} style={{ opacity: oauthLoading ? 0.7 : 1 }}>
            {oauthLoading === "apple" ? (
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.39.07 2.37.74 3.17.8 1.21-.24 2.37-.93 3.68-.84 1.56.12 2.74.75 3.53 1.91-3.27 1.97-2.49 6.14.62 7.41-.73 1.55-1.69 3.08-3 3.6zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            )}
            Continuar com Apple
          </button>
          <button className="btn-social" onClick={handleGoogleLogin} disabled={oauthLoading !== null} style={{ opacity: oauthLoading ? 0.7 : 1 }}>
            {oauthLoading === "google" ? (
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--p)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continuar com Google
          </button>
        </div>

        <button className="btn-outline" onClick={() => setScreen("register")}>
          Criar conta com e-mail
        </button>
        <div style={{ textAlign: "center", color: "var(--mt)", fontSize: 12, marginTop: 16, cursor: "pointer" }}>
          Esqueci minha senha
        </div>
      </div>
    </main>
  );
}
