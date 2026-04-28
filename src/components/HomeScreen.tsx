"use client";

import { useState } from "react";
import BottomNav from "./BottomNav";

type Tab = "home" | "search" | "chat" | "loja" | "perfil";

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Conteúdo da aba atual */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
        {tab === "home" && <FeedTab />}
        {tab === "search" && <SearchTab />}
        {tab === "chat" && <ChatTab />}
        {tab === "loja" && <LojaTab />}
        {tab === "perfil" && <PerfilTab />}
      </div>

      <BottomNav active={tab} onChange={(t) => setTab(t as Tab)} />
    </div>
  );
}

/* ── FEED ── */
function FeedTab() {
  return (
    <div style={{ padding: "16px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 14, color: "var(--pk)" }}>📍</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: "var(--txt)" }}>Pinheiros, SP</span>
          <span style={{ fontSize: 11, color: "var(--mt)" }}>▾</span>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--p)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", cursor: "pointer" }}>
          J
        </div>
      </div>

      {/* Stories */}
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16, marginBottom: 8 }}>
        {VENUES.map((v) => (
          <div key={v.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{ position: "relative", width: 58, height: 58 }}>
              {v.story && (
                <div style={{ position: "absolute", inset: -3, borderRadius: "50%", background: "conic-gradient(#FF006E, #9D4EDD, #00D9FF, #FF006E)" }} />
              )}
              <div style={{ position: "absolute", inset: v.story ? 2 : 0, borderRadius: "50%", background: v.color + "25", border: v.story ? "2px solid var(--bg)" : "0.5px solid var(--bd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: v.color }}>
                {v.initial}
              </div>
            </div>
            <span style={{ fontSize: 10, color: "var(--mt)", maxWidth: 58, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
          </div>
        ))}
      </div>

      {/* Posts do feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {POSTS.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

function PostCard({ post }: { post: typeof POSTS[0] }) {
  const [liked, setLiked] = useState(false);

  return (
    <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, overflow: "hidden" }}>
      {/* Autor */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: post.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
          {post.initial}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{post.user}</span>
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: post.statusBg, color: post.statusColor, fontWeight: 700 }}>{post.status}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--mt)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "var(--pk)" }}>📍</span> {post.venue}
          </div>
        </div>
        {/* Timer */}
        <div style={{ fontSize: 10, color: "var(--mt)", background: "#1A1A35", padding: "4px 8px", borderRadius: 8 }}>
          {post.timer}
        </div>
      </div>

      {/* Foto */}
      <div style={{ width: "100%", aspectRatio: "4/5", background: post.photoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>
        {post.emoji}
      </div>

      {/* Ações */}
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => setLiked(!liked)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: liked ? "var(--pk)" : "var(--mt)", fontSize: 13 }}>
          <span style={{ fontSize: 20 }}>{liked ? "♥" : "♡"}</span>
          {post.likes + (liked ? 1 : 0)}
        </button>
        <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "var(--mt)", fontSize: 13 }}>
          <span style={{ fontSize: 18 }}>💬</span> {post.comments}
        </button>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--mt)" }}>{post.time}</div>
      </div>

      {post.caption && (
        <div style={{ padding: "0 14px 12px", fontSize: 13, color: "var(--txt)", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700, color: "var(--txt)" }}>{post.user.split(" ")[0]} </span>
          {post.caption}
        </div>
      )}
    </div>
  );
}

/* ── BUSCAR ── */
function SearchTab() {
  const [query, setQuery] = useState("");
  const filtered = VENUES.filter((v) =>
    query === "" || v.name.toLowerCase().includes(query.toLowerCase()) || v.hood.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)", marginBottom: 16 }}>Buscar</div>
      <div style={{ display: "flex", alignItems: "center", background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 14, padding: "0 14px", gap: 10, marginBottom: 20 }}>
        <span style={{ color: "var(--mt)" }}>🔍</span>
        <input
          style={{ flex: 1, background: "transparent", border: "none", color: "var(--txt)", fontSize: 14, padding: "13px 0", outline: "none" }}
          placeholder="Rolê, bairro, estilo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div style={{ fontSize: 9, color: "var(--mt)", fontWeight: 900, letterSpacing: 1, marginBottom: 12 }}>{filtered.length} LUGARES</div>
      {filtered.map((v) => <VenueCard key={v.id} venue={v} />)}
    </div>
  );
}

function VenueCard({ venue: v }: { venue: typeof VENUES[0] }) {
  const [fav, setFav] = useState(false);
  return (
    <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, padding: 14, marginBottom: 11, cursor: "pointer" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div style={{ position: "relative", width: 46, height: 46, flexShrink: 0 }}>
          {v.story && <div style={{ position: "absolute", inset: -3, borderRadius: "50%", background: "conic-gradient(#FF006E,#9D4EDD,#00D9FF,#FF006E)" }} />}
          <div style={{ position: "absolute", inset: v.story ? 2 : 0, borderRadius: "50%", background: v.color + "20", border: v.story ? "2px solid var(--bg)" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: v.color }}>
            {v.initial}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 900, fontSize: 15, color: "var(--txt)" }}>{v.name}</span>
            <span style={{ fontSize: 11, color: "var(--mt)" }}>· {v.hood}</span>
            <span style={{ fontSize: 11, color: "var(--mt)" }}>· 📍 {v.dist}</span>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
            {v.tags.map((t) => <span key={t} style={{ display: "inline-block", background: "var(--pd)", color: "var(--p)", fontSize: 10, padding: "3px 9px", borderRadius: 20, border: "0.5px solid #9D4EDD44", fontWeight: 700 }}>{t}</span>)}
          </div>
        </div>
        <span onClick={(e) => { e.stopPropagation(); setFav(!fav); }} style={{ color: fav ? "var(--pk)" : "var(--mt)", fontSize: 20, cursor: "pointer", flexShrink: 0 }}>
          {fav ? "♥" : "♡"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, background: "#1A1A35", borderRadius: 4, height: 5 }}>
          <div style={{ width: `${v.occ}%`, background: v.occColor, borderRadius: 4, height: 5 }} />
        </div>
        <span style={{ fontSize: 11, color: v.occColor, fontWeight: 900, whiteSpace: "nowrap" }}>{v.occLabel}</span>
        <span style={{ fontSize: 14, color: "var(--txt)", fontWeight: 900, letterSpacing: 1 }}>{v.price}</span>
      </div>
    </div>
  );
}

/* ── CHAT ── */
function ChatTab() {
  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)", marginBottom: 4 }}>Chat</div>
      <div style={{ fontSize: 13, color: "var(--mt)", marginBottom: 20 }}>Mensagens somem em 8h</div>
      {CHATS.map((c) => (
        <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "0.5px solid var(--bd)", cursor: "pointer" }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
            {c.initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--txt)" }}>{c.name}</span>
              <span style={{ fontSize: 10, color: "var(--mt)" }}>{c.time}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--mt)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last}</div>
          </div>
          {c.unread > 0 && (
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--p)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
              {c.unread}
            </div>
          )}
        </div>
      ))}
      {CHATS.length === 0 && (
        <div style={{ textAlign: "center", paddingTop: 60, color: "var(--mt)" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>💬</div>
          <div style={{ fontWeight: 900 }}>Nenhuma conversa ainda</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Vá a um rolê e comece a interagir!</div>
        </div>
      )}
    </div>
  );
}

/* ── LOJA ── */
function LojaTab() {
  const myPts = 340;
  const rewards = [
    { n: "Drink grátis no Bar Brahma", pts: 200, e: "🍺" },
    { n: "1 like extra para dar", pts: 50, e: "💘" },
    { n: "Entrada grátis Cine Joia", pts: 500, e: "🎫" },
    { n: "Fura-fila (1 uso)", pts: 150, e: "⚡" },
    { n: "Revelar curtida extra", pts: 100, e: "👀" },
  ];

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)", marginBottom: 16 }}>Lojinha</div>
      <div style={{ background: "#9D4EDD18", border: "0.5px solid #9D4EDD35", borderRadius: 16, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>⭐</span>
          <div>
            <div style={{ fontSize: 9, color: "var(--mt)", fontWeight: 900, letterSpacing: 1 }}>SEU SALDO</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "var(--p)" }}>{myPts} pts</div>
          </div>
        </div>
        <button style={{ background: "var(--pd)", color: "var(--p)", border: "0.5px solid #9D4EDD44", borderRadius: 12, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Histórico</button>
      </div>
      <div style={{ fontSize: 10, fontWeight: 900, color: "var(--txt)", letterSpacing: 0.5, marginBottom: 12 }}>RESGATAR PONTOS</div>
      {rewards.map((item) => (
        <div key={item.n} style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, padding: 14, marginBottom: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 26 }}>{item.e}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{item.n}</div>
              <div style={{ fontSize: 12, color: item.pts <= myPts ? "var(--p)" : "var(--mt)", fontWeight: 900, marginTop: 2 }}>
                {item.pts} pts{item.pts > myPts ? " · insuficiente" : ""}
              </div>
            </div>
          </div>
          <button style={{ background: item.pts <= myPts ? "var(--p)" : "#1A1A35", color: item.pts <= myPts ? "#fff" : "var(--mt)", border: "none", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: item.pts <= myPts ? "pointer" : "default" }}>
            {item.pts <= myPts ? "Resgatar" : "—"}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── PERFIL ── */
function PerfilTab() {
  const STATUS_OPTIONS = [
    { label: "Solteiro", color: "#22C55E", dot: "🟢" },
    { label: "Namorando", color: "#EF4444", dot: "🔴" },
    { label: "Ficando / Enrolado", color: "#F59E0B", dot: "🟡" },
    { label: "Só curtindo", color: "var(--cy)", dot: "😎" },
  ];
  const [status, setStatus] = useState(0);

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ width: 82, height: 82, borderRadius: "50%", background: "var(--p)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 auto 14px" }}>
          J
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)" }}>João Silva</div>
        <div style={{ fontSize: 13, color: "var(--mt)", marginTop: 4 }}>Pinheiros · 26 anos</div>
        {/* Badge de status */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 20, padding: "6px 14px", cursor: "pointer" }}
          onClick={() => setStatus((s) => (s + 1) % STATUS_OPTIONS.length)}>
          <span>{STATUS_OPTIONS[status].dot}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_OPTIONS[status].color }}>{STATUS_OPTIONS[status].label}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { l: "Rolês visitados", v: "12", e: "📍" },
          { l: "Avaliações", v: "8", e: "⭐" },
          { l: "Seguidores", v: "84", e: "👥" },
          { l: "Curtidas recebidas", v: "5", e: "💘" },
        ].map((s) => (
          <div key={s.l} style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 14, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.e}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "var(--txt)" }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "var(--mt)", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, overflow: "hidden" }}>
        {[
          { l: "Editar perfil", e: "✏️" },
          { l: "Privacidade", e: "🔒" },
          { l: "Notificações", e: "🔔" },
          { l: "Suporte", e: "💬" },
        ].map((item, i, arr) => (
          <div key={item.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 16px", cursor: "pointer", borderBottom: i < arr.length - 1 ? "0.5px solid var(--bd)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 16 }}>{item.e}</span>
              <span style={{ fontSize: 14, color: "var(--txt)" }}>{item.l}</span>
            </div>
            <span style={{ color: "var(--mt)", fontSize: 18 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── DADOS MOCK ── */
const VENUES = [
  { id: 1, name: "Cine Joia", hood: "Liberdade", dist: "1,2 km", occ: 85, occColor: "#EF4444", occLabel: "Lotado", price: "$$", tags: ["Eletrônica", "House"], story: true, initial: "CJ", color: "#9D4EDD" },
  { id: 2, name: "Bar Brahma", hood: "Centro", dist: "2,8 km", occ: 50, occColor: "#F59E0B", occLabel: "Médio", price: "$$", tags: ["MPB", "Samba"], story: false, initial: "BB", color: "#00D9FF" },
  { id: 3, name: "D-Edge", hood: "Barra Funda", dist: "4,1 km", occ: 30, occColor: "#22C55E", occLabel: "Tranquilo", price: "$$$", tags: ["Techno", "Dark"], story: true, initial: "DE", color: "#FF006E" },
  { id: 4, name: "Yacht Club", hood: "Itaim Bibi", dist: "3,5 km", occ: 70, occColor: "#F59E0B", occLabel: "Cheio", price: "$$$", tags: ["Pop", "Funk"], story: true, initial: "YC", color: "#F59E0B" },
];

const POSTS = [
  { id: 1, user: "Ana Ribeiro", initial: "A", color: "#9D4EDD", status: "🟢 Solteira", statusBg: "#22C55E20", statusColor: "#22C55E", venue: "Cine Joia", timer: "3h restantes", photoBg: "#9D4EDD15", emoji: "🎵", likes: 24, comments: 6, time: "há 20 min", caption: "Que noite incrível aqui! 🔥" },
  { id: 2, user: "Pedro Melo", initial: "P", color: "#00D9FF", status: "😎 Só curtindo", statusBg: "#00D9FF20", statusColor: "#00D9FF", venue: "Bar Brahma", timer: "1h restante", photoBg: "#00D9FF15", emoji: "🍺", likes: 11, comments: 2, time: "há 1h", caption: "Pagode no Brahma tá demais 🎶" },
  { id: 3, user: "Carla Santos", initial: "C", color: "#FF006E", status: "🟡 Ficando", statusBg: "#F59E0B20", statusColor: "#F59E0B", venue: "D-Edge", timer: "6h restantes", photoBg: "#FF006E15", emoji: "🌃", likes: 38, comments: 9, time: "há 2h", caption: null },
];

const CHATS = [
  { id: 1, name: "Mariana Costa", initial: "M", color: "#9D4EDD", last: "Te vi no Cine Joia hahaha", time: "22:14", unread: 2 },
  { id: 2, name: "Rafael Lima", initial: "R", color: "#FF006E", last: "Qual bar você tá?", time: "21:50", unread: 0 },
];
