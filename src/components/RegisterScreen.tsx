"use client";

import { useState } from "react";
import Logo from "./Logo";
import { supabase } from "@/lib/supabase";

const TYPES = ["Balada", "Bar", "Pagode", "Sertanejo", "Eletrônica", "Boteco", "Show", "Rock", "Jazz", "Techno", "Funk", "MPB"];

interface Props {
  onBack: () => void;
  onDone: () => void;
}

export default function RegisterScreen({ onBack, onDone }: Props) {
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bairro, setBairro] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleType(t: string) {
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  function handleBack() {
    setError("");
    if (step > 1) setStep(step - 1);
    else onBack();
  }

  async function handleNext() {
    setError("");

    if (step === 1) {
      if (!nome || !email || !password) { setError("Preencha todos os campos."); return; }
      if (password.length < 6) { setError("Senha precisa ter ao menos 6 caracteres."); return; }
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    // Passo 3 — criar conta de verdade
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError("Erro ao criar conta. Tente outro e-mail.");
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        nome,
        bairro,
        tipos_favoritos: selectedTypes,
        status: "solteiro",
      });
    }

    setLoading(false);
    onDone();
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "54px 28px 32px" }}>
      <div style={{ width: "100%", maxWidth: 430, display: "flex", flexDirection: "column", minHeight: "calc(100vh - 86px)" }}>
        <button style={{ background: "none", border: "none", color: "var(--mt)", fontSize: 14, cursor: "pointer", textAlign: "left", marginBottom: 24 }} onClick={handleBack}>
          ← Voltar
        </button>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)" }}>Criar conta</div>
          <div style={{ fontSize: 13, color: "var(--mt)", marginTop: 4 }}>Passo {step} de 3</div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= step ? "#9D4EDD" : "#1E1E38", transition: "background 0.3s" }} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input className="inp" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
            <input className="inp" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="inp" type="password" placeholder="Senha (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input className="inp" placeholder="Bairro em SP" value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--txt)", marginBottom: 6 }}>Que rolê você curte?</div>
            <div style={{ fontSize: 13, color: "var(--mt)", marginBottom: 16 }}>Selecione quantos quiser</div>
            <div>
              {TYPES.map((t) => (
                <span key={t} onClick={() => toggleType(t)} style={{ display: "inline-block", margin: "0 8px 8px 0", padding: "10px 16px", background: selectedTypes.includes(t) ? "var(--pd)" : "#12122A", border: `0.5px solid ${selectedTypes.includes(t) ? "#9D4EDD" : "var(--bd)"}`, borderRadius: 24, color: selectedTypes.includes(t) ? "var(--p)" : "var(--mt)", fontSize: 13, fontWeight: selectedTypes.includes(t) ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: "center", paddingTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <Logo width={150} height={70} size={40} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--txt)", marginBottom: 10 }}>
              Precisamos da sua localização
            </div>
            <div style={{ fontSize: 14, color: "var(--mt)", lineHeight: 1.6, marginBottom: 24 }}>
              Para mostrar os rolês mais perto de você. Obrigatória para usar o app.
            </div>
            <div style={{ background: "#9D4EDD15", border: "0.5px solid #9D4EDD30", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 13, color: "var(--p)", fontWeight: 700 }}>🔒 Localização privada</div>
              <div style={{ fontSize: 12, color: "var(--mt)", marginTop: 4 }}>Nunca compartilhada com outros usuários</div>
            </div>
          </div>
        )}

        {error && <div style={{ color: "#EF4444", fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</div>}

        <div style={{ marginTop: "auto", paddingTop: 24 }}>
          <button className="btn-primary" onClick={handleNext} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? "Criando conta..." : step === 3 ? "🚀 Começar a explorar" : "Continuar →"}
          </button>
        </div>
      </div>
    </main>
  );
}
