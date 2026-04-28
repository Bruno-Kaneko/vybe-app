"use client";

type Tab = "home" | "search" | "chat" | "loja" | "perfil";

function IconHome({ active }: { active: boolean }) {
  const c = active ? "var(--p)" : "var(--mt)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H15v-5h-6v5H4a1 1 0 01-1-1V10.5z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? c + "22" : "none"} />
    </svg>
  );
}

function IconSearch({ active }: { active: boolean }) {
  const c = active ? "var(--p)" : "var(--mt)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke={c} strokeWidth="1.8" />
      <path d="M16.5 16.5L21 21" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconChat({ active }: { active: boolean }) {
  const c = active ? "var(--p)" : "var(--mt)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? c + "22" : "none"} />
    </svg>
  );
}

function IconStar({ active }: { active: boolean }) {
  const c = active ? "var(--p)" : "var(--mt)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? c + "22" : "none"} />
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  const c = active ? "var(--p)" : "var(--mt)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" />
      <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const TABS: { id: Tab; Icon: React.ComponentType<{ active: boolean }> }[] = [
  { id: "home",   Icon: IconHome },
  { id: "search", Icon: IconSearch },
  { id: "chat",   Icon: IconChat },
  { id: "loja",   Icon: IconStar },
  { id: "perfil", Icon: IconProfile },
];

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export default function BottomNav({ active, onChange }: Props) {
  return (
    <div style={{ height: 66, background: "var(--surf)", borderTop: "0.5px solid var(--bd)", display: "flex", alignItems: "stretch", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }}>
      {TABS.map(({ id, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s" }}
        >
          <Icon active={active === id} />
        </button>
      ))}
    </div>
  );
}
