"use client";

import { useState, useRef } from "react";

const SLIDES = [
  {
    iconBg: "linear-gradient(135deg, #9D4EDD, #C03EFF)",
    icon: (
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Bem-vindo ao Vybe",
    subtitle: "A rede social da noite. Viva o momento, descubra o próximo rolê.",
    dotColor: "#C03EFF",
    btnGradient: "linear-gradient(90deg, #9D4EDD, #FF006E)",
  },
  {
    iconBg: "linear-gradient(135deg, #FF006E, #FF6B00)",
    icon: (
      <svg width="52" height="52" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      </svg>
    ),
    title: "Descubra Rolês",
    subtitle: "Veja o que está acontecendo AGORA nas festas e bares perto de você.",
    dotColor: "#FF006E",
    btnGradient: "linear-gradient(90deg, #FF006E, #FF6B00)",
  },
  {
    iconBg: "linear-gradient(135deg, #4F46E5, #9D4EDD)",
    icon: (
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Conecte-se",
    subtitle: "Poste fotos e vídeos direto do rolê. Conteúdo temporário que some em até 8h.",
    dotColor: "#9D4EDD",
    btnGradient: "linear-gradient(90deg, #4F46E5, #9D4EDD)",
  },
  {
    iconBg: "linear-gradient(135deg, #F59E0B, #FF006E)",
    icon: (
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
      </svg>
    ),
    title: "Ganhe Pontos",
    subtitle: "Escaneie QR Codes, poste e troque pontos por recompensas exclusivas.",
    dotColor: "#F59E0B",
    btnGradient: "linear-gradient(90deg, #F59E0B, #FF006E)",
  },
];

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  function finish() {
    onDone();
  }

  function advance() {
    if (step < SLIDES.length - 1) setStep(step + 1);
    else finish();
  }

  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 48 && dy < 80) {
      if (dx < 0) advance();
      else goBack();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000", display: "flex", flexDirection: "column", overflow: "hidden", touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={finish}
        style={{ position: "absolute", top: 52, right: 24, background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 14, cursor: "pointer", fontFamily: "inherit", zIndex: 10 }}
      >
        Pular
      </button>

      <div
        key={step}
        className="onbo-slide"
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px 24px", gap: 36 }}
      >
        <div style={{ width: 112, height: 112, borderRadius: "50%", background: slide.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {slide.icon}
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 14, letterSpacing: -0.3 }}>{slide.title}</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{slide.subtitle}</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {SLIDES.map((s, i) => (
            <div
              key={i}
              style={{
                height: 8,
                width: i === step ? 26 : 8,
                borderRadius: 4,
                background: i === step ? s.dotColor : "rgba(255,255,255,0.18)",
                transition: "width 0.3s ease, background 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>

      <button
        key={`btn-${step}`}
        onClick={advance}
        style={{
          padding: "22px 0",
          background: slide.btnGradient,
          border: "none",
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          letterSpacing: 0.2,
          flexShrink: 0,
        }}
      >
        {isLast ? "Começar" : "Próximo"}
        {!isLast && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </button>
    </div>
  );
}
