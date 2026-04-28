"use client";

import { useState, useEffect } from "react";
import BottomNav from "./BottomNav";
import { supabase } from "@/lib/supabase";

type Tab = "home" | "search" | "chat" | "loja" | "perfil";

type Profile = {
  id: string;
  nome: string;
  bairro: string;
  tipos_favoritos: string[];
  status: string;
};

type Venue = {
  id: number;
  name: string;
  hood: string;
  address: string;
  tags: string[];
  price: string;
  close_time: string;
  entry: string;
  parking: boolean;
  transit: string;
  has_seat: boolean;
  vibe_type: string;
  color: string;
  initial: string;
  occ: number;
  image_url: string | null;
};

function occInfo(occ: number) {
  if (occ >= 86) return { color: "#EF4444", label: "Lotado" };
  if (occ >= 66) return { color: "#F59E0B", label: "Cheio" };
  if (occ >= 41) return { color: "#F59E0B", label: "Médio" };
  return { color: "#22C55E", label: "Tranquilo" };
}

function VenueAvatar({ v, size = 46 }: { v: Venue; size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: v.color + "20", border: `0.5px solid ${v.color}40`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.3, fontWeight: 900, color: v.color }}>
        {v.image_url
          ? <img src={v.image_url} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : v.initial}
      </div>
    </div>
  );
}

export default function HomeScreen({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase
      .from("venues")
      .select("*")
      .eq("status", "aprovado")
      .order("name")
      .then(({ data }) => {
        if (data) setVenues(data as Venue[]);
        setLoadingVenues(false);
      });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()
        .then(({ data: p }) => { if (p) setProfile(p as Profile); });
    });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
        {tab === "home" && <FeedTab venues={venues} loading={loadingVenues} />}
        {tab === "search" && <SearchTab venues={venues} loading={loadingVenues} />}
        {tab === "chat" && <ChatTab />}
        {tab === "loja" && <LojaTab />}
        {tab === "perfil" && <PerfilTab profile={profile} onSignOut={onSignOut} />}
      </div>
      <BottomNav active={tab} onChange={(t) => setTab(t as Tab)} />
    </div>
  );
}

/* ── FEED ── */
function FeedTab({ venues, loading }: { venues: Venue[]; loading: boolean }) {
  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 14, color: "var(--pk)" }}>📍</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: "var(--txt)" }}>São Paulo, SP</span>
          <span style={{ fontSize: 11, color: "var(--mt)" }}>▾</span>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--p)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", cursor: "pointer" }}>
          J
        </div>
      </div>

      {/* Stories dos lugares */}
      {loading ? (
        <div style={{ display: "flex", gap: 14, paddingBottom: 16, marginBottom: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div style={{ width: 58, height: 58, borderRadius: "50%", background: "#1E1E38" }} />
              <div style={{ width: 42, height: 8, borderRadius: 4, background: "#1E1E38" }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16, marginBottom: 8 }}>
          {venues.map((v) => (
            <div key={v.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <VenueAvatar v={v} size={58} />
              <span style={{ fontSize: 10, color: "var(--mt)", maxWidth: 58, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {POSTS.map((post) => <PostCard key={post.id} post={post} />)}
      </div>

      {!loading && venues.length === 0 && (
        <div style={{ textAlign: "center", paddingTop: 40, color: "var(--mt)" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏙️</div>
          <div style={{ fontWeight: 900 }}>Nenhum lugar por aqui ainda</div>
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: typeof POSTS[0] }) {
  const [liked, setLiked] = useState(false);
  return (
    <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: post.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
          {post.initial}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{post.user}</span>
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: post.statusBg, color: post.statusColor, fontWeight: 700 }}>{post.status}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--mt)", marginTop: 2 }}>
            <span style={{ color: "var(--pk)" }}>📍</span> {post.venue}
          </div>
        </div>
        <div style={{ fontSize: 10, color: "var(--mt)", background: "#1A1A35", padding: "4px 8px", borderRadius: 8 }}>{post.timer}</div>
      </div>
      <div style={{ width: "100%", aspectRatio: "4/5", background: post.photoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>
        {post.emoji}
      </div>
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
          <span style={{ fontWeight: 700 }}>{post.user.split(" ")[0]} </span>{post.caption}
        </div>
      )}
    </div>
  );
}

/* ── BUSCAR ── */
const FILTER_TYPES = ["Balada", "Bar", "Pagode", "Sertanejo", "Eletrônica", "Boteco", "Show", "Rock", "Jazz", "Techno", "Funk", "MPB"];

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

function SearchTab({ venues, loading }: { venues: Venue[]; loading: boolean }) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showFilter, setShowFilter] = useState(false);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterPrices, setFilterPrices] = useState<string[]>([]);
  const [filterOcc, setFilterOcc] = useState<string[]>([]);

  const activeFilters = filterTypes.length + filterPrices.length + filterOcc.length;

  const filtered = venues.filter((v) => {
    const matchQuery =
      query === "" ||
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.hood.toLowerCase().includes(query.toLowerCase()) ||
      (v.tags || []).some((t) => t.toLowerCase().includes(query.toLowerCase()));
    const matchType = filterTypes.length === 0 || (v.tags || []).some((t) => filterTypes.includes(t));
    const matchPrice = filterPrices.length === 0 || filterPrices.includes(v.price);
    const matchOcc = filterOcc.length === 0 || filterOcc.includes(occInfo(v.occ).label);
    return matchQuery && matchType && matchPrice && matchOcc;
  });

  function clearFilters() {
    setFilterTypes([]);
    setFilterPrices([]);
    setFilterOcc([]);
  }

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)", marginBottom: 16 }}>Buscar</div>

      {/* Search + map + filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 14, padding: "0 14px", gap: 10 }}>
          <span style={{ color: "var(--mt)" }}>🔍</span>
          <input style={{ flex: 1, background: "transparent", border: "none", color: "var(--txt)", fontSize: 14, padding: "13px 0", outline: "none" }}
            placeholder="Rolê, bairro, estilo..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <button onClick={() => setViewMode(viewMode === "list" ? "map" : "list")} style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid", borderColor: viewMode === "map" ? "var(--p)" : "var(--bd)", background: viewMode === "map" ? "var(--pd)" : "var(--card)", color: viewMode === "map" ? "var(--p)" : "var(--mt)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
          </svg>
        </button>

        <button onClick={() => setShowFilter(true)} style={{ position: "relative", width: 48, height: 48, borderRadius: 14, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid", borderColor: activeFilters > 0 ? "var(--p)" : "var(--bd)", background: activeFilters > 0 ? "var(--pd)" : "var(--card)", color: activeFilters > 0 ? "var(--p)" : "var(--mt)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          {activeFilters > 0 && (
            <div style={{ position: "absolute", top: 7, right: 7, width: 15, height: 15, borderRadius: "50%", background: "var(--p)", color: "#fff", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {activeFilters}
            </div>
          )}
        </button>
      </div>

      {/* Map view */}
      {viewMode === "map" && (
        <div style={{ borderRadius: 18, overflow: "hidden", border: "0.5px solid var(--bd)", marginBottom: 16 }}>
          <iframe
            src="https://www.openstreetmap.org/export/embed.html?bbox=-46.71%2C-23.62%2C-46.55%2C-23.50&layer=mapnik"
            style={{ width: "100%", height: 420, border: "none", display: "block" }}
            title="Mapa São Paulo"
          />
          <div style={{ background: "var(--card)", padding: "10px 14px", fontSize: 12, color: "var(--mt)", textAlign: "center" }}>
            Marcadores dos rolês chegam em breve ·{" "}
            <a href="https://www.openstreetmap.org/#map=13/-23.555/-46.630" target="_blank" rel="noopener noreferrer" style={{ color: "var(--p)" }}>
              Abrir completo
            </a>
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, padding: 14, height: 88 }} />
            ))}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: "var(--mt)", fontWeight: 900, letterSpacing: 1 }}>{filtered.length} LUGARES</div>
              {activeFilters > 0 && (
                <button onClick={clearFilters} style={{ background: "none", border: "none", color: "var(--p)", fontSize: 12, cursor: "pointer" }}>
                  Limpar filtros
                </button>
              )}
            </div>
            {filtered.map((v) => <VenueCard key={v.id} venue={v} />)}
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 40, color: "var(--mt)" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                <div style={{ fontWeight: 900 }}>Nenhum lugar encontrado</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Tente outros filtros</div>
              </div>
            )}
          </>
        )
      )}

      {/* Filter bottom sheet */}
      {showFilter && (
        <>
          <div onClick={() => setShowFilter(false)} style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 40 }} />
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "var(--surf)", borderRadius: "24px 24px 0 0", border: "0.5px solid var(--bd)", zIndex: 50, padding: "20px 20px 48px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ width: 36, height: 3, background: "var(--bd)", borderRadius: 2, margin: "0 auto 20px" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "var(--txt)" }}>Filtrar</div>
              <button onClick={clearFilters} style={{ background: "none", border: "none", color: "var(--mt)", fontSize: 13, cursor: "pointer" }}>Limpar tudo</button>
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5, marginBottom: 10 }}>TIPO DE ROLÊ</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {FILTER_TYPES.map((t) => (
                  <span key={t} onClick={() => setFilterTypes(toggle(filterTypes, t))} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", background: filterTypes.includes(t) ? "var(--pd)" : "#12122A", color: filterTypes.includes(t) ? "var(--p)" : "var(--mt)", border: `0.5px solid ${filterTypes.includes(t) ? "#9D4EDD" : "var(--bd)"}`, fontWeight: filterTypes.includes(t) ? 700 : 400 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5, marginBottom: 10 }}>FAIXA DE PREÇO</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["$", "$$", "$$$"].map((p) => (
                  <span key={p} onClick={() => setFilterPrices(toggle(filterPrices, p))} style={{ padding: "8px 22px", borderRadius: 20, fontSize: 14, cursor: "pointer", fontWeight: 900, background: filterPrices.includes(p) ? "var(--pd)" : "#12122A", color: filterPrices.includes(p) ? "var(--p)" : "var(--mt)", border: `0.5px solid ${filterPrices.includes(p) ? "#9D4EDD" : "var(--bd)"}` }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5, marginBottom: 10 }}>OCUPAÇÃO AGORA</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[{ label: "Tranquilo", color: "#22C55E" }, { label: "Médio", color: "#F59E0B" }, { label: "Cheio", color: "#F59E0B" }, { label: "Lotado", color: "#EF4444" }].map(({ label, color }) => (
                  <span key={label} onClick={() => setFilterOcc(toggle(filterOcc, label))} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", background: filterOcc.includes(label) ? color + "20" : "#12122A", color: filterOcc.includes(label) ? color : "var(--mt)", border: `0.5px solid ${filterOcc.includes(label) ? color + "60" : "var(--bd)"}`, fontWeight: filterOcc.includes(label) ? 700 : 400 }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <button className="btn-primary" onClick={() => setShowFilter(false)}>
              Ver {filtered.length} {filtered.length === 1 ? "lugar" : "lugares"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function VenueCard({ venue: v }: { venue: Venue }) {
  const [fav, setFav] = useState(false);
  const { color: occColor, label: occLabel } = occInfo(v.occ);

  return (
    <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, padding: 14, marginBottom: 11, cursor: "pointer" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <VenueAvatar v={v} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 900, fontSize: 15, color: "var(--txt)" }}>{v.name}</span>
            <span style={{ fontSize: 11, color: "var(--mt)" }}>· {v.hood}</span>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
            {(v.tags || []).map((t) => (
              <span key={t} style={{ display: "inline-block", background: "var(--pd)", color: "var(--p)", fontSize: 10, padding: "3px 9px", borderRadius: 20, border: "0.5px solid #9D4EDD44", fontWeight: 700 }}>{t}</span>
            ))}
          </div>
        </div>
        <span onClick={(e) => { e.stopPropagation(); setFav(!fav); }} style={{ color: fav ? "var(--pk)" : "var(--mt)", fontSize: 20, cursor: "pointer", flexShrink: 0 }}>
          {fav ? "♥" : "♡"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, background: "#1A1A35", borderRadius: 4, height: 5 }}>
          <div style={{ width: `${v.occ}%`, background: occColor, borderRadius: 4, height: 5 }} />
        </div>
        <span style={{ fontSize: 11, color: occColor, fontWeight: 900, whiteSpace: "nowrap" }}>{occLabel}</span>
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
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--p)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#fff" }}>
              {c.unread}
            </div>
          )}
        </div>
      ))}
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
              <div style={{ fontSize: 12, color: item.pts <= myPts ? "var(--p)" : "var(--mt)", fontWeight: 900, marginTop: 2 }}>{item.pts} pts{item.pts > myPts ? " · insuficiente" : ""}</div>
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
const STATUS_OPTIONS = [
  { label: "Solteiro", color: "#22C55E", dot: "🟢", key: "solteiro" },
  { label: "Namorando", color: "#EF4444", dot: "🔴", key: "namorando" },
  { label: "Ficando / Enrolado", color: "#F59E0B", dot: "🟡", key: "ficando" },
  { label: "Só curtindo", color: "#00D9FF", dot: "😎", key: "curtindo" },
];

function PerfilTab({ profile, onSignOut }: { profile: Profile | null; onSignOut: () => void }) {
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    if (!profile) return;
    const idx = STATUS_OPTIONS.findIndex((s) => s.key === profile.status);
    setStatusIdx(idx >= 0 ? idx : 0);
  }, [profile]);

  async function handleStatusChange() {
    const newIdx = (statusIdx + 1) % STATUS_OPTIONS.length;
    setStatusIdx(newIdx);
    if (profile) {
      await supabase.from("profiles").update({ status: STATUS_OPTIONS[newIdx].key }).eq("id", profile.id);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    onSignOut();
  }

  const initial = profile?.nome ? profile.nome.charAt(0).toUpperCase() : "?";
  const nome = profile?.nome ?? "Carregando...";
  const bairro = profile?.bairro ?? "";

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ width: 82, height: 82, borderRadius: "50%", background: "var(--p)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 auto 14px" }}>
          {initial}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)" }}>{nome}</div>
        {bairro && <div style={{ fontSize: 13, color: "var(--mt)", marginTop: 4 }}>{bairro}</div>}
        <div onClick={handleStatusChange} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 20, padding: "6px 14px", cursor: "pointer" }}>
          <span>{STATUS_OPTIONS[statusIdx].dot}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_OPTIONS[statusIdx].color }}>{STATUS_OPTIONS[statusIdx].label}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[{ l: "Rolês visitados", v: "0", e: "📍" }, { l: "Avaliações", v: "0", e: "⭐" }, { l: "Seguidores", v: "0", e: "👥" }, { l: "Curtidas recebidas", v: "0", e: "💘" }].map((s) => (
          <div key={s.l} style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 14, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.e}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "var(--txt)" }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "var(--mt)", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, overflow: "hidden", marginBottom: 16 }}>
        {[{ l: "Editar perfil", e: "✏️" }, { l: "Privacidade", e: "🔒" }, { l: "Notificações", e: "🔔" }, { l: "Suporte", e: "💬" }].map((item) => (
          <div key={item.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 16px", cursor: "pointer", borderBottom: "0.5px solid var(--bd)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 16 }}>{item.e}</span>
              <span style={{ fontSize: 14, color: "var(--txt)" }}>{item.l}</span>
            </div>
            <span style={{ color: "var(--mt)", fontSize: 18 }}>›</span>
          </div>
        ))}
        <div onClick={handleSignOut} style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 16px", cursor: "pointer" }}>
          <span style={{ fontSize: 16 }}>🚪</span>
          <span style={{ fontSize: 14, color: "#EF4444" }}>Sair da conta</span>
        </div>
      </div>
    </div>
  );
}

/* ── MOCK DATA (posts e chats — conectar ao banco depois) ── */
const POSTS = [
  { id: 1, user: "Ana Ribeiro", initial: "A", color: "#9D4EDD", status: "🟢 Solteira", statusBg: "#22C55E20", statusColor: "#22C55E", venue: "Cine Joia", timer: "3h restantes", photoBg: "#9D4EDD15", emoji: "🎵", likes: 24, comments: 6, time: "há 20 min", caption: "Que noite incrível aqui! 🔥" },
  { id: 2, user: "Pedro Melo", initial: "P", color: "#00D9FF", status: "😎 Só curtindo", statusBg: "#00D9FF20", statusColor: "#00D9FF", venue: "Bar Brahma", timer: "1h restante", photoBg: "#00D9FF15", emoji: "🍺", likes: 11, comments: 2, time: "há 1h", caption: "Pagode no Brahma tá demais 🎶" },
  { id: 3, user: "Carla Santos", initial: "C", color: "#FF006E", status: "🟡 Ficando", statusBg: "#F59E0B20", statusColor: "#F59E0B", venue: "D-Edge", timer: "6h restantes", photoBg: "#FF006E15", emoji: "🌃", likes: 38, comments: 9, time: "há 2h", caption: null },
];

const CHATS = [
  { id: 1, name: "Mariana Costa", initial: "M", color: "#9D4EDD", last: "Te vi no Cine Joia hahaha", time: "22:14", unread: 2 },
  { id: 2, name: "Rafael Lima", initial: "R", color: "#FF006E", last: "Qual bar você tá?", time: "21:50", unread: 0 },
];
