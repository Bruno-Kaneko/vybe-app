"use client";

import { useState, useEffect } from "react";
import BottomNav from "./BottomNav";
import { supabase } from "@/lib/supabase";

type Tab = "home" | "search" | "chat" | "loja" | "perfil";

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
  lat?: number | null;
  lng?: number | null;
};

type Profile = {
  id: string;
  nome: string;
  bairro: string;
  tipos_favoritos: string[];
  status: string;
  avatar_url?: string | null;
};

type RealPost = {
  id: number;
  user_id: string;
  venue_id: number | null;
  image_url: string;
  duration: number;
  expires_at: string;
  created_at: string;
  profiles: { nome: string; status: string; avatar_url?: string | null } | null;
  venues: { name: string; hood: string } | null;
};

type UserLocation = { lat: number; lng: number };

const STATUS_OPTIONS = [
  { label: "Solteiro", color: "#22C55E", dot: "🟢", key: "solteiro" },
  { label: "Namorando", color: "#EF4444", dot: "🔴", key: "namorando" },
  { label: "Ficando / Enrolado", color: "#F59E0B", dot: "🟡", key: "ficando" },
  { label: "Só curtindo", color: "#00D9FF", dot: "😎", key: "curtindo" },
];

/* ── HELPERS ── */
function occInfo(occ: number) {
  if (occ >= 86) return { color: "#EF4444", label: "Lotado" };
  if (occ >= 66) return { color: "#F59E0B", label: "Cheio" };
  if (occ >= 41) return { color: "#F59E0B", label: "Médio" };
  return { color: "#22C55E", label: "Tranquilo" };
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expirado";
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return h > 0 ? `${h}h restantes` : `${m}min`;
}

function timeSince(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  return `há ${Math.floor(m / 60)}h`;
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

/* ── AVATAR DO VENUE ── */
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

/* ── AVATAR DO USUÁRIO ── */
function UserAvatar({ profile, size = 36 }: { profile: { nome?: string; avatar_url?: string | null } | null; size?: number }) {
  const initial = profile?.nome?.charAt(0).toUpperCase() ?? "?";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--p)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt={initial} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initial}
    </div>
  );
}

/* ── HOME SCREEN ── */
export default function HomeScreen({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<RealPost[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedVenueProfile, setSelectedVenueProfile] = useState<Venue | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  async function fetchPosts() {
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(nome, status, avatar_url), venues(name, hood)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (data) setPosts(data as RealPost[]);
  }

  useEffect(() => {
    supabase.from("venues").select("*").eq("status", "aprovado").order("name")
      .then(({ data }) => { if (data) setVenues(data as Venue[]); setLoadingVenues(false); });

    fetchPosts();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase.from("profiles").select("*").eq("id", session.user.id).single()
        .then(({ data: p }) => { if (p) setProfile(p as Profile); });
    });

    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* sem GPS — tudo bem */ }
    );
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
        {tab === "home" && <FeedTab venues={venues} loading={loadingVenues} profile={profile} onGoToProfile={() => setTab("perfil")} posts={posts} onVenuePress={setSelectedVenueProfile} />}
        {tab === "search" && <SearchTab venues={venues} loading={loadingVenues} userLocation={userLocation} onVenuePress={setSelectedVenueProfile} />}
        {tab === "chat" && <ChatTab />}
        {tab === "loja" && <LojaTab />}
        {tab === "perfil" && <PerfilTab profile={profile} setProfile={setProfile} onSignOut={onSignOut} />}
      </div>
      <BottomNav active={tab} onChange={(t) => setTab(t as Tab)} />

      {tab === "home" && (
        <button onClick={() => setShowPostModal(true)} style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #9D4EDD, #FF006E)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px #9D4EDD70", zIndex: 30 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
      )}

      {showPostModal && (
        <PostModal venues={venues} profile={profile} onClose={() => setShowPostModal(false)} onPosted={() => { setShowPostModal(false); fetchPosts(); }} />
      )}

      {selectedVenueProfile && (
        <VenueProfileModal venue={selectedVenueProfile} userLocation={userLocation} onClose={() => setSelectedVenueProfile(null)} />
      )}
    </div>
  );
}

/* ── FEED ── */
function FeedTab({ venues, loading, profile, onGoToProfile, posts, onVenuePress }: {
  venues: Venue[]; loading: boolean; profile: Profile | null;
  onGoToProfile: () => void; posts: RealPost[]; onVenuePress: (v: Venue) => void;
}) {
  const [selectedHood, setSelectedHood] = useState<string | null>(null);
  const [showHoodPicker, setShowHoodPicker] = useState(false);
  const hoods = [...new Set(venues.map((v) => v.hood))].sort();
  const visibleVenues = selectedHood ? venues.filter((v) => v.hood === selectedHood) : venues;

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <div onClick={() => setShowHoodPicker((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
            <span style={{ fontSize: 14, color: "var(--pk)" }}>📍</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: "var(--txt)" }}>{selectedHood ?? "São Paulo, SP"}</span>
            <span style={{ fontSize: 11, color: "var(--mt)", display: "inline-block", transition: "transform 0.2s", transform: showHoodPicker ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
          </div>
          {showHoodPicker && (
            <>
              <div onClick={() => setShowHoodPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 16, minWidth: 210, maxHeight: 260, overflowY: "auto", zIndex: 50, boxShadow: "0 8px 32px #00000070", animation: "slideDown 0.18s ease" }}>
                <div onClick={() => { setSelectedHood(null); setShowHoodPicker(false); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "0.5px solid var(--bd)", cursor: "pointer" }}>
                  <span style={{ fontSize: 14, fontWeight: selectedHood === null ? 700 : 400, color: selectedHood === null ? "var(--p)" : "var(--txt)" }}>🌆 São Paulo, SP</span>
                  {selectedHood === null && <span style={{ color: "var(--p)", fontSize: 12 }}>✓</span>}
                </div>
                {hoods.map((hood) => (
                  <div key={hood} onClick={() => { setSelectedHood(hood); setShowHoodPicker(false); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "0.5px solid var(--bd)", cursor: "pointer" }}>
                    <span style={{ fontSize: 14, fontWeight: selectedHood === hood ? 700 : 400, color: selectedHood === hood ? "var(--p)" : "var(--txt)" }}>📍 {hood}</span>
                    {selectedHood === hood && <span style={{ color: "var(--p)", fontSize: 12 }}>✓</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div onClick={onGoToProfile}>
          <UserAvatar profile={profile} size={38} />
        </div>
      </div>

      {/* Stories */}
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
          {visibleVenues.map((v) => (
            <div key={v.id} onClick={() => onVenuePress(v)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer" }}>
              <VenueAvatar v={v} size={58} />
              <span style={{ fontSize: 10, color: "var(--mt)", maxWidth: 58, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {posts.length > 0
          ? posts.map((p) => <RealPostCard key={p.id} post={p} />)
          : (
            <div style={{ textAlign: "center", paddingTop: 40, color: "var(--mt)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
              <div style={{ fontWeight: 900, fontSize: 16, color: "var(--txt)", marginBottom: 8 }}>Nenhum post ainda</div>
              <div style={{ fontSize: 13 }}>Seja o primeiro a postar de um rolê!</div>
            </div>
          )}
      </div>
    </div>
  );
}

function RealPostCard({ post }: { post: RealPost }) {
  const [liked, setLiked] = useState(false);
  const nome = post.profiles?.nome ?? "Usuário";
  const badge = STATUS_OPTIONS.find((s) => s.key === (post.profiles?.status ?? "solteiro")) ?? STATUS_OPTIONS[0];
  const venueName = post.venues?.name ?? "Rolê";

  return (
    <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <UserAvatar profile={post.profiles} size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{nome}</span>
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: badge.color + "20", color: badge.color, fontWeight: 700 }}>{badge.dot} {badge.label}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--mt)", marginTop: 2 }}><span style={{ color: "var(--pk)" }}>📍</span> {venueName}</div>
        </div>
        <div style={{ fontSize: 10, color: "var(--mt)", background: "#1A1A35", padding: "4px 8px", borderRadius: 8 }}>{timeLeft(post.expires_at)}</div>
      </div>
      <div style={{ width: "100%", aspectRatio: "4/5", overflow: "hidden" }}>
        <img src={post.image_url} alt="post" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => setLiked(!liked)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: liked ? "var(--pk)" : "var(--mt)", fontSize: 13 }}>
          <span style={{ fontSize: 20 }}>{liked ? "♥" : "♡"}</span> 0
        </button>
        <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "var(--mt)", fontSize: 13 }}>
          <span style={{ fontSize: 18 }}>💬</span> 0
        </button>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--mt)" }}>{timeSince(post.created_at)}</div>
      </div>
    </div>
  );
}

/* ── POST MODAL ── */
function PostModal({ venues, profile, onClose, onPosted }: { venues: Venue[]; profile: Profile | null; onClose: () => void; onPosted: () => void }) {
  const [step, setStep] = useState<"photo" | "details">("photo");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [venueQuery, setVenueQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [duration, setDuration] = useState<2 | 4 | 6 | 8>(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep("details");
  }

  const filteredVenues = venues.filter((v) =>
    venueQuery === "" || v.name.toLowerCase().includes(venueQuery.toLowerCase()) || v.hood.toLowerCase().includes(venueQuery.toLowerCase())
  );

  async function handlePost() {
    if (!selectedFile || !selectedVenue || !profile) return;
    setLoading(true); setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sem sessão");
      const ext = selectedFile.name.split(".").pop() ?? "jpg";
      const fileName = `${session.user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("posts").upload(fileName, selectedFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(fileName);
      const expiresAt = new Date(Date.now() + duration * 3600000).toISOString();
      const { error: insertError } = await supabase.from("posts").insert({ user_id: session.user.id, venue_id: selectedVenue.id, image_url: publicUrl, duration, expires_at: expiresAt });
      if (insertError) throw insertError;
      onPosted();
    } catch { setError("Erro ao publicar. Tente novamente."); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 70, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "54px 20px 16px", gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--mt)", fontSize: 22, cursor: "pointer" }}>✕</button>
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--txt)" }}>{step === "photo" ? "Tirar foto" : "Detalhes do post"}</div>
        {step === "details" && <button onClick={() => { setStep("photo"); setSelectedFile(null); setPreviewUrl(null); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--p)", fontSize: 13, cursor: "pointer" }}>Trocar foto</button>}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 40px" }}>
        {step === "photo" && (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "var(--card)", border: "2px dashed var(--bd)", borderRadius: 24, minHeight: 340, cursor: "pointer" }}>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />
            <div style={{ fontSize: 56 }}>📷</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--txt)" }}>Tirar foto</div>
            <div style={{ fontSize: 13, color: "var(--mt)" }}>Toque para abrir a câmera</div>
          </label>
        )}
        {step === "details" && (
          <>
            {previewUrl && <div style={{ borderRadius: 18, overflow: "hidden", marginBottom: 20, aspectRatio: "4/5" }}><img src={previewUrl} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt="preview" /></div>}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "var(--txt)", marginBottom: 10 }}>📍 Em qual rolê você está?</div>
              {selectedVenue ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--pd)", border: "0.5px solid #9D4EDD44", borderRadius: 12, padding: "10px 14px" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--p)", flex: 1 }}>{selectedVenue.name}</span>
                  <span style={{ fontSize: 11, color: "var(--mt)" }}>{selectedVenue.hood}</span>
                  <button onClick={() => setSelectedVenue(null)} style={{ background: "none", border: "none", color: "var(--mt)", cursor: "pointer", fontSize: 14, marginLeft: 4 }}>✕</button>
                </div>
              ) : (
                <>
                  <input className="inp" placeholder="Buscar rolê..." value={venueQuery} onChange={(e) => setVenueQuery(e.target.value)} />
                  {venueQuery && (
                    <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 14, marginTop: 6, overflow: "hidden", maxHeight: 200, overflowY: "auto" }}>
                      {filteredVenues.slice(0, 6).map((v) => (
                        <div key={v.id} onClick={() => { setSelectedVenue(v); setVenueQuery(""); }} style={{ padding: "12px 14px", cursor: "pointer", borderBottom: "0.5px solid var(--bd)", display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)" }}>{v.name}</span>
                          <span style={{ fontSize: 12, color: "var(--mt)" }}>{v.hood}</span>
                        </div>
                      ))}
                      {filteredVenues.length === 0 && <div style={{ padding: 14, color: "var(--mt)", fontSize: 13 }}>Nenhum rolê encontrado</div>}
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "var(--txt)", marginBottom: 10 }}>⏰ Por quanto tempo?</div>
              <div style={{ display: "flex", gap: 10 }}>
                {([2, 4, 6, 8] as const).map((h) => (
                  <button key={h} onClick={() => setDuration(h)} style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "0.5px solid", borderColor: duration === h ? "var(--p)" : "var(--bd)", background: duration === h ? "var(--pd)" : "var(--card)", color: duration === h ? "var(--p)" : "var(--mt)", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>{h}h</button>
                ))}
              </div>
            </div>
            {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            <button className="btn-primary" onClick={handlePost} disabled={!selectedVenue || loading} style={{ opacity: !selectedVenue || loading ? 0.6 : 1 }}>{loading ? "Publicando..." : "🚀 Publicar agora"}</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── BUSCAR ── */
const FILTER_TYPES = ["Balada", "Bar", "Pagode", "Sertanejo", "Eletrônica", "Boteco", "Show", "Rock", "Jazz", "Techno", "Funk", "MPB"];

function SearchTab({ venues, loading, userLocation, onVenuePress }: { venues: Venue[]; loading: boolean; userLocation: UserLocation | null; onVenuePress: (v: Venue) => void }) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showFilter, setShowFilter] = useState(false);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterPrices, setFilterPrices] = useState<string[]>([]);
  const [filterOcc, setFilterOcc] = useState<string[]>([]);

  const activeFilters = filterTypes.length + filterPrices.length + filterOcc.length;
  const filtered = venues.filter((v) => {
    const matchQuery = query === "" || v.name.toLowerCase().includes(query.toLowerCase()) || v.hood.toLowerCase().includes(query.toLowerCase()) || (v.tags || []).some((t) => t.toLowerCase().includes(query.toLowerCase()));
    const matchType = filterTypes.length === 0 || (v.tags || []).some((t) => filterTypes.includes(t));
    const matchPrice = filterPrices.length === 0 || filterPrices.includes(v.price);
    const matchOcc = filterOcc.length === 0 || filterOcc.includes(occInfo(v.occ).label);
    return matchQuery && matchType && matchPrice && matchOcc;
  });

  function clearFilters() { setFilterTypes([]); setFilterPrices([]); setFilterOcc([]); }

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)", marginBottom: 16 }}>Buscar</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 14, padding: "0 14px", gap: 10 }}>
          <span style={{ color: "var(--mt)" }}>🔍</span>
          <input style={{ flex: 1, background: "transparent", border: "none", color: "var(--txt)", fontSize: 14, padding: "13px 0", outline: "none" }} placeholder="Rolê, bairro, estilo..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button onClick={() => setViewMode(viewMode === "list" ? "map" : "list")} style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid", borderColor: viewMode === "map" ? "var(--p)" : "var(--bd)", background: viewMode === "map" ? "var(--pd)" : "var(--card)", color: viewMode === "map" ? "var(--p)" : "var(--mt)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>
        </button>
        <button onClick={() => setShowFilter(true)} style={{ position: "relative", width: 48, height: 48, borderRadius: 14, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid", borderColor: activeFilters > 0 ? "var(--p)" : "var(--bd)", background: activeFilters > 0 ? "var(--pd)" : "var(--card)", color: activeFilters > 0 ? "var(--p)" : "var(--mt)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
          {activeFilters > 0 && <div style={{ position: "absolute", top: 7, right: 7, width: 15, height: 15, borderRadius: "50%", background: "var(--p)", color: "#fff", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeFilters}</div>}
        </button>
      </div>

      {viewMode === "map" && (
        <div style={{ borderRadius: 18, overflow: "hidden", border: "0.5px solid var(--bd)", marginBottom: 16 }}>
          <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=-46.71%2C-23.62%2C-46.55%2C-23.50&layer=mapnik" style={{ width: "100%", height: 420, border: "none", display: "block" }} title="Mapa São Paulo" />
          <div style={{ background: "var(--card)", padding: "10px 14px", fontSize: 12, color: "var(--mt)", textAlign: "center" }}>
            Marcadores em breve · <a href="https://www.openstreetmap.org/#map=13/-23.555/-46.630" target="_blank" rel="noopener noreferrer" style={{ color: "var(--p)" }}>Abrir completo</a>
          </div>
        </div>
      )}

      {viewMode === "list" && (
        loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>{[1, 2, 3].map((i) => <div key={i} style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, padding: 14, height: 88 }} />)}</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: "var(--mt)", fontWeight: 900, letterSpacing: 1 }}>{filtered.length} LUGARES</div>
              {activeFilters > 0 && <button onClick={clearFilters} style={{ background: "none", border: "none", color: "var(--p)", fontSize: 12, cursor: "pointer" }}>Limpar filtros</button>}
            </div>
            {filtered.map((v) => <VenueCard key={v.id} venue={v} userLocation={userLocation} onClick={() => onVenuePress(v)} />)}
            {filtered.length === 0 && <div style={{ textAlign: "center", paddingTop: 40, color: "var(--mt)" }}><div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div><div style={{ fontWeight: 900 }}>Nenhum lugar encontrado</div></div>}
          </>
        )
      )}

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
                {FILTER_TYPES.map((t) => <span key={t} onClick={() => setFilterTypes(toggle(filterTypes, t))} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", background: filterTypes.includes(t) ? "var(--pd)" : "#12122A", color: filterTypes.includes(t) ? "var(--p)" : "var(--mt)", border: `0.5px solid ${filterTypes.includes(t) ? "#9D4EDD" : "var(--bd)"}`, fontWeight: filterTypes.includes(t) ? 700 : 400 }}>{t}</span>)}
              </div>
            </div>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5, marginBottom: 10 }}>FAIXA DE PREÇO</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["$", "$$", "$$$", "$$$$", "$$$$$"].map((p) => <span key={p} onClick={() => setFilterPrices(toggle(filterPrices, p))} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 900, background: filterPrices.includes(p) ? "var(--pd)" : "#12122A", color: filterPrices.includes(p) ? "var(--p)" : "var(--mt)", border: `0.5px solid ${filterPrices.includes(p) ? "#9D4EDD" : "var(--bd)"}` }}>{p}</span>)}
              </div>
            </div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5, marginBottom: 10 }}>OCUPAÇÃO AGORA</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[{ label: "Tranquilo", color: "#22C55E" }, { label: "Médio", color: "#F59E0B" }, { label: "Cheio", color: "#F59E0B" }, { label: "Lotado", color: "#EF4444" }].map(({ label, color }) => <span key={label} onClick={() => setFilterOcc(toggle(filterOcc, label))} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", background: filterOcc.includes(label) ? color + "20" : "#12122A", color: filterOcc.includes(label) ? color : "var(--mt)", border: `0.5px solid ${filterOcc.includes(label) ? color + "60" : "var(--bd)"}`, fontWeight: filterOcc.includes(label) ? 700 : 400 }}>{label}</span>)}
              </div>
            </div>
            <button className="btn-primary" onClick={() => setShowFilter(false)}>Ver {filtered.length} {filtered.length === 1 ? "lugar" : "lugares"}</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── PERFIL DO ESTABELECIMENTO (Instagram-style) ── */
function VenueProfileModal({ venue: v, userLocation, onClose }: { venue: Venue; userLocation: UserLocation | null; onClose: () => void }) {
  const { color: occColor, label: occLabel } = occInfo(v.occ);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [venuePosts, setVenuePosts] = useState<RealPost[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [agendaMsg, setAgendaMsg] = useState(false);
  const [activeTab, setActiveTab] = useState<"grid" | "info">("grid");

  const dist = userLocation && v.lat && v.lng ? formatDist(haversine(userLocation.lat, userLocation.lng, v.lat, v.lng)) : null;

  useEffect(() => {
    supabase.from("venue_follows").select("*", { count: "exact", head: true }).eq("venue_id", v.id)
      .then(({ count }) => setFollowers(count ?? 0));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
      supabase.from("venue_follows").select("user_id").eq("venue_id", v.id).eq("user_id", session.user.id).maybeSingle()
        .then(({ data }) => setIsFollowing(!!data));
    });

    supabase.from("posts").select("*").eq("venue_id", v.id).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setVenuePosts(data as RealPost[]); });
  }, [v.id]);

  async function toggleFollow() {
    if (!userId) return;
    if (isFollowing) {
      await supabase.from("venue_follows").delete().eq("venue_id", v.id).eq("user_id", userId);
      setIsFollowing(false); setFollowers((f) => f - 1);
    } else {
      await supabase.from("venue_follows").insert({ user_id: userId, venue_id: v.id });
      setIsFollowing(true); setFollowers((f) => f + 1);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 70, overflowY: "auto" }}>
      {/* Hero cover */}
      <div style={{ position: "relative", width: "100%", height: 220, background: v.color + "20", overflow: "hidden" }}>
        {v.image_url
          ? <img src={v.image_url} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80, fontWeight: 900, color: v.color, opacity: 0.2 }}>{v.initial}</div>
        }
        <button onClick={onClose} style={{ position: "absolute", top: 52, left: 16, width: 38, height: 38, borderRadius: "50%", background: "#00000070", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
      </div>

      {/* Avatar sobrepondo o cover */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: -50 }}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", border: "3px solid var(--bg)", overflow: "hidden", background: v.color + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900, color: v.color }}>
          {v.image_url ? <img src={v.image_url} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : v.initial}
        </div>
      </div>

      {/* Info */}
      <div style={{ textAlign: "center", padding: "16px 24px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)", marginBottom: 4 }}>{v.name}</div>
        <div style={{ fontSize: 13, color: "var(--mt)", marginBottom: dist ? 6 : 12 }}>{v.hood}</div>
        {dist && <div style={{ fontSize: 12, color: "var(--cy)", marginBottom: 12, fontWeight: 700 }}>📍 {dist} de você</div>}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {(v.tags || []).map((t) => <span key={t} style={{ background: "var(--pd)", color: "var(--p)", fontSize: 11, padding: "4px 12px", borderRadius: 20, border: "0.5px solid #9D4EDD44", fontWeight: 700 }}>{t}</span>)}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", justifyContent: "center", gap: 40, marginBottom: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--txt)" }}>{venuePosts.length}</div>
            <div style={{ fontSize: 11, color: "var(--mt)", marginTop: 2 }}>posts</div>
          </div>
          <div style={{ width: 1, background: "var(--bd)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--txt)" }}>{followers}</div>
            <div style={{ fontSize: 11, color: "var(--mt)", marginTop: 2 }}>seguidores</div>
          </div>
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <button onClick={toggleFollow} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "0.5px solid", borderColor: isFollowing ? "var(--bd)" : "var(--p)", background: isFollowing ? "transparent" : "var(--p)", color: isFollowing ? "var(--txt)" : "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {isFollowing ? "✓ Seguindo" : "+ Seguir"}
          </button>
          <button onClick={() => setAgendaMsg(true)} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "0.5px solid var(--bd)", background: "transparent", color: "var(--txt)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            📅 Agenda
          </button>
        </div>
      </div>

      {agendaMsg && (
        <>
          <div onClick={() => setAgendaMsg(false)} style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 80 }} />
          <div style={{ position: "fixed", left: 20, right: 20, top: "50%", transform: "translateY(-50%)", background: "var(--card)", borderRadius: 20, padding: 28, zIndex: 90, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "var(--txt)", marginBottom: 8 }}>Agenda em breve</div>
            <div style={{ fontSize: 13, color: "var(--mt)", marginBottom: 20 }}>Os eventos dos estabelecimentos vão aparecer aqui em breve!</div>
            <button onClick={() => setAgendaMsg(false)} className="btn-primary">Entendido</button>
          </div>
        </>
      )}

      {/* Tabs — Instagram style */}
      <div style={{ display: "flex", borderTop: "0.5px solid var(--bd)", borderBottom: "0.5px solid var(--bd)" }}>
        <button onClick={() => setActiveTab("grid")} style={{ flex: 1, padding: "14px 0", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: activeTab === "grid" ? "2px solid var(--txt)" : "2px solid transparent" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={activeTab === "grid" ? "var(--txt)" : "var(--mt)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>
        <button onClick={() => setActiveTab("info")} style={{ flex: 1, padding: "14px 0", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: activeTab === "info" ? "2px solid var(--txt)" : "2px solid transparent" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={activeTab === "info" ? "var(--txt)" : "var(--mt)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5" /><line x1="12" y1="12" x2="12" y2="16" />
          </svg>
        </button>
      </div>

      {/* Tab: Grid de fotos */}
      {activeTab === "grid" && (
        <div style={{ paddingBottom: 48 }}>
          {venuePosts.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
              {venuePosts.map((p) => (
                <div key={p.id} style={{ aspectRatio: "1", overflow: "hidden" }}>
                  <img src={p.image_url} alt="post" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--mt)" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>📸</div>
              <div style={{ fontWeight: 900, fontSize: 15, color: "var(--txt)", marginBottom: 8 }}>Nenhuma foto ainda</div>
              <div style={{ fontSize: 13 }}>Seja o primeiro a postar aqui!</div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Informações */}
      {activeTab === "info" && (
        <div style={{ padding: "20px 20px 48px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Lotação */}
          <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5 }}>LOTAÇÃO AGORA</div>
              <span style={{ fontSize: 12, color: occColor, fontWeight: 900 }}>{occLabel} · {v.occ}%</span>
            </div>
            <div style={{ background: "#1A1A35", borderRadius: 6, height: 8 }}>
              <div style={{ width: `${v.occ}%`, background: occColor, borderRadius: 6, height: 8 }} />
            </div>
          </div>

          {/* Grid de info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { e: "💰", label: "Preço", value: v.price },
              { e: "🕒", label: "Fecha às", value: v.close_time || "—" },
              { e: "🚇", label: "Transporte", value: v.transit || "—" },
              { e: "🅿️", label: "Estacionamento", value: v.parking ? "Disponível" : "Sem vaga" },
              { e: "🎫", label: "Entrada", value: v.entry || "Gratuita" },
              { e: "🪑", label: "Assento", value: v.has_seat ? "Tem assento" : "Em pé" },
            ].map((item) => (
              <div key={item.label} style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{item.e}</div>
                <div style={{ fontSize: 11, color: "var(--mt)", marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Endereço */}
          {v.address && (
            <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14 }}>
              <span style={{ fontSize: 20 }}>📍</span>
              <div>
                <div style={{ fontSize: 11, color: "var(--mt)", marginBottom: 4, letterSpacing: 0.5 }}>ENDEREÇO</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", lineHeight: 1.6 }}>{v.address}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VenueCard({ venue: v, onClick, userLocation }: { venue: Venue; onClick: () => void; userLocation: UserLocation | null }) {
  const [fav, setFav] = useState(false);
  const { color: occColor, label: occLabel } = occInfo(v.occ);
  const dist = userLocation && v.lat && v.lng ? formatDist(haversine(userLocation.lat, userLocation.lng, v.lat, v.lng)) : null;

  return (
    <div onClick={onClick} style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, padding: 14, marginBottom: 11, cursor: "pointer" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <VenueAvatar v={v} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 900, fontSize: 15, color: "var(--txt)" }}>{v.name}</span>
            <span style={{ fontSize: 11, color: "var(--mt)" }}>· {v.hood}</span>
            {dist && <span style={{ fontSize: 11, color: "var(--cy)", fontWeight: 700 }}>· {dist}</span>}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
            {(v.tags || []).map((t) => <span key={t} style={{ display: "inline-block", background: "var(--pd)", color: "var(--p)", fontSize: 10, padding: "3px 9px", borderRadius: 20, border: "0.5px solid #9D4EDD44", fontWeight: 700 }}>{t}</span>)}
          </div>
        </div>
        <span onClick={(e) => { e.stopPropagation(); setFav(!fav); }} style={{ color: fav ? "var(--pk)" : "var(--mt)", fontSize: 20, cursor: "pointer", flexShrink: 0 }}>{fav ? "♥" : "♡"}</span>
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
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff", flexShrink: 0 }}>{c.initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--txt)" }}>{c.name}</span>
              <span style={{ fontSize: 10, color: "var(--mt)" }}>{c.time}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--mt)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last}</div>
          </div>
          {c.unread > 0 && <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--p)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#fff" }}>{c.unread}</div>}
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

/* ── PERFIL DO USUÁRIO ── */
function PerfilTab({ profile, setProfile, onSignOut }: { profile: Profile | null; setProfile: (p: Profile) => void; onSignOut: () => void }) {
  const [statusIdx, setStatusIdx] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const idx = STATUS_OPTIONS.findIndex((s) => s.key === profile.status);
    setStatusIdx(idx >= 0 ? idx : 0);
  }, [profile]);

  async function handleStatusChange() {
    const newIdx = (statusIdx + 1) % STATUS_OPTIONS.length;
    setStatusIdx(newIdx);
    if (profile) await supabase.from("profiles").update({ status: STATUS_OPTIONS[newIdx].key }).eq("id", profile.id);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${profile.id}.${ext}`;
    await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
    setProfile({ ...profile, avatar_url: publicUrl });
    setUploadingAvatar(false);
  }

  async function handleSignOut() { await supabase.auth.signOut(); onSignOut(); }

  const nome = profile?.nome ?? "Carregando...";
  const bairro = profile?.bairro ?? "";
  const tipos = profile?.tipos_favoritos ?? [];

  return (
    <div style={{ padding: "16px 20px" }}>
      {/* Avatar com upload */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 14px" }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "var(--p)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900, color: "#fff" }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : nome.charAt(0).toUpperCase()
            }
          </div>
          <label style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderRadius: "50%", background: "var(--p)", border: "2px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
            {uploadingAvatar
              ? <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            }
          </label>
        </div>

        <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)" }}>{nome}</div>
        {bairro && <div style={{ fontSize: 13, color: "var(--mt)", marginTop: 4 }}>{bairro}</div>}
        <div onClick={handleStatusChange} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 20, padding: "6px 14px", cursor: "pointer" }}>
          <span>{STATUS_OPTIONS[statusIdx].dot}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_OPTIONS[statusIdx].color }}>{STATUS_OPTIONS[statusIdx].label}</span>
        </div>
      </div>

      {/* Tipos favoritos */}
      {tipos.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5, marginBottom: 10 }}>ESTILOS FAVORITOS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tipos.map((t) => <span key={t} style={{ background: "var(--pd)", color: "var(--p)", fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "0.5px solid #9D4EDD44", fontWeight: 700 }}>{t}</span>)}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[{ l: "Rolês visitados", v: "0", e: "📍" }, { l: "Posts ativos", v: "0", e: "📸" }, { l: "Seguidores", v: "0", e: "👥" }, { l: "Seguindo", v: "0", e: "💜" }].map((s) => (
          <div key={s.l} style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 14, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.e}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "var(--txt)" }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "var(--mt)", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Galeria (premium) */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, padding: 20, marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: "var(--txt)", marginBottom: 4 }}>Galeria de fotos</div>
        <div style={{ fontSize: 12, color: "var(--mt)", marginBottom: 14 }}>Disponível para assinantes Vybe+</div>
        <button style={{ background: "linear-gradient(135deg, #9D4EDD, #FF006E)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Assinar Vybe+</button>
      </div>

      {/* Menu */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, overflow: "hidden" }}>
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

/* ── MOCK (chat) ── */
const CHATS = [
  { id: 1, name: "Mariana Costa", initial: "M", color: "#9D4EDD", last: "Te vi no Cine Joia hahaha", time: "22:14", unread: 2 },
  { id: 2, name: "Rafael Lima", initial: "R", color: "#FF006E", last: "Qual bar você tá?", time: "21:50", unread: 0 },
];
