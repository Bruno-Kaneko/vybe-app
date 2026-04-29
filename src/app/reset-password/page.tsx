"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  }, []);

  async function handleReset() {
    setError("");
    if (password.length < 6) { setError("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError("Não foi possível redefinir a senha. Tente novamente.");
    else setDone(true);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#04040A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px 40px" }}>
      <div style={{ width: "100%", maxWidth: 430 }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 180, paddingLeft: 56 }}>
          <Logo />
        </div>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#F0F0FA", marginBottom: 8 }}>Senha redefinida!</div>
            <div style={{ fontSize: 14, color: "#6060A0", marginBottom: 28 }}>Sua nova senha foi salva com sucesso.</div>
            <a href="/" style={{ display: "block", width: "100%", padding: "14px 0", borderRadius: 14, background: "#9D4EDD", color: "#fff", fontWeight: 800, fontSize: 15, textAlign: "center", textDecoration: "none" }}>
              Entrar no Vybe
            </a>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: "center", color: "#6060A0", fontSize: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #9D4EDD", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            Verificando link...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#F0F0FA", marginBottom: 6 }}>Nova senha</div>
            <div style={{ fontSize: 14, color: "#6060A0", marginBottom: 24 }}>Escolha uma nova senha para sua conta.</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <input className="inp" type="password" placeholder="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} />
              <input className="inp" type="password" placeholder="Confirmar senha" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReset()} />
            </div>

            {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

            <button className="btn-primary" onClick={handleReset} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
