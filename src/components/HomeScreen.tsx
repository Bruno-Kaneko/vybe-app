"use client";

import { useState, useEffect, useRef } from "react";
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
  menu?: Array<{ name: string; price: string; category: string }> | null;
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
  venues: { name: string; hood: string; tags?: string[] } | null;
};

type UserLocation = { lat: number; lng: number };

type SelectedUser = { id: string; nome: string; avatar_url?: string | null; status: string };

type Message = {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  expires_at: string;
  sender?: { nome: string; avatar_url?: string | null } | null;
  receiver?: { nome: string; avatar_url?: string | null } | null;
};

const STATUS_OPTIONS = [
  { label: "Solteiro", color: "#22C55E", key: "solteiro" },
  { label: "Namorando", color: "#EF4444", key: "namorando" },
  { label: "Ficando / Enrolado", color: "#F59E0B", key: "ficando" },
  { label: "Só curtindo", color: "#00D9FF", key: "curtindo" },
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

/* ── ÍCONES SVG ── */
function PinIcon({ size = 14, color = "var(--pk)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CalendarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function CameraIcon({ size = 22, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function HeartIcon({ filled = false, size = 20, color = "currentColor" }: { filled?: boolean; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function ShareIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
function CommentIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ClockIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function StarIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--p)" stroke="var(--p)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function LockIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function EditIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function BellIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function LogoutIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function BookmarkIcon({ filled = false, size = 22, color = "currentColor" }: { filled?: boolean; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function UsersIcon({ size = 22, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
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
  const [showCamera, setShowCamera] = useState(false);
  const [selectedVenueProfile, setSelectedVenueProfile] = useState<Venue | null>(null);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [followedVenueIds, setFollowedVenueIds] = useState<number[]>([]);
  const [followsLoaded, setFollowsLoaded] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  async function fetchPosts() {
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(nome, status, avatar_url), venues(name, hood, tags)")
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
      supabase.from("venue_follows").select("venue_id").eq("user_id", session.user.id)
        .then(({ data: follows }) => {
          setFollowedVenueIds(follows ? follows.map((f: { venue_id: number }) => f.venue_id) : []);
          setFollowsLoaded(true);
        });
    });

    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    if (tab !== "home") return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (tab !== "home" || touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (dx > 70 && dy < 80) setShowCamera(true);
    touchStartX.current = null;
    touchStartY.current = null;
  }

  return (
    <div
      style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
        {tab === "home" && <FeedTab venues={venues} loading={loadingVenues} profile={profile} onGoToProfile={() => setTab("perfil")} posts={posts} onVenuePress={setSelectedVenueProfile} followedVenueIds={followedVenueIds} followsLoaded={followsLoaded} onUserPress={setSelectedUser} />}
        {tab === "search" && <SearchTab venues={venues} loading={loadingVenues} userLocation={userLocation} onVenuePress={setSelectedVenueProfile} onUserPress={setSelectedUser} />}
        {tab === "chat" && <ChatTab myId={profile?.id ?? null} />}
        {tab === "loja" && <LojaTab />}
        {tab === "perfil" && <PerfilTab profile={profile} setProfile={setProfile} onSignOut={onSignOut} />}
      </div>
      <BottomNav active={tab} onChange={(t) => setTab(t as Tab)} />

      {showCamera && (
        <CameraModal venues={venues} profile={profile} onClose={() => setShowCamera(false)} onPosted={() => { setShowCamera(false); fetchPosts(); }} />
      )}

      {selectedVenueProfile && (
        <VenueProfileModal venue={selectedVenueProfile} userLocation={userLocation} onClose={() => setSelectedVenueProfile(null)} />
      )}

      {selectedUser && (
        <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}

/* ── POSTS DEMO (mostrados quando o feed está vazio) ── */
const now = Date.now();
const DEMO_POSTS: RealPost[] = [
  {
    id: -1,
    user_id: "demo-1",
    venue_id: null,
    image_url: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=600&q=80",
    duration: 8,
    expires_at: new Date(now + 5 * 3600000).toISOString(),
    created_at: new Date(now - 45 * 60000).toISOString(),
    profiles: { nome: "Julia Santos", status: "solteiro", avatar_url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&q=80" },
    venues: { name: "Bar Brahma", hood: "Centro", tags: ["Bar"] },
  },
  {
    id: -2,
    user_id: "demo-2",
    venue_id: null,
    image_url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80",
    duration: 6,
    expires_at: new Date(now + 3 * 3600000).toISOString(),
    created_at: new Date(now - 70 * 60000).toISOString(),
    profiles: { nome: "Rafael Lima", status: "ficando", avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80" },
    venues: { name: "Cine Joia", hood: "Liberdade", tags: ["Balada"] },
  },
  {
    id: -3,
    user_id: "demo-3",
    venue_id: null,
    image_url: "https://images.unsplash.com/photo-1543007631-283050bb3e8c?w=600&q=80",
    duration: 4,
    expires_at: new Date(now + 1 * 3600000).toISOString(),
    created_at: new Date(now - 110 * 60000).toISOString(),
    profiles: { nome: "Ana Souza", status: "curtindo", avatar_url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80" },
    venues: { name: "Frank Bar", hood: "Vila Madalena", tags: ["Boteco"] },
  },
];

/* ── FEED ── */
function FeedTab({ venues, loading, profile, onGoToProfile, posts, onVenuePress, followedVenueIds, followsLoaded, onUserPress }: {
  venues: Venue[]; loading: boolean; profile: Profile | null;
  onGoToProfile: () => void; posts: RealPost[]; onVenuePress: (v: Venue) => void;
  followedVenueIds: number[]; followsLoaded: boolean; onUserPress: (u: SelectedUser) => void;
}) {
  const [selectedHood, setSelectedHood] = useState<string | null>(null);
  const [showHoodPicker, setShowHoodPicker] = useState(false);
  const hoods = [...new Set(venues.map((v) => v.hood))].sort();
  const hoodFiltered = selectedHood ? venues.filter((v) => v.hood === selectedHood) : venues;
  const visibleVenues = followsLoaded && followedVenueIds.length > 0
    ? hoodFiltered.filter((v) => followedVenueIds.includes(v.id))
    : [];

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <div onClick={() => setShowHoodPicker((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
            {selectedHood ? (
              <>
                <PinIcon size={14} color="var(--pk)" />
                <span style={{ fontSize: 15, fontWeight: 900, color: "var(--txt)" }}>{selectedHood}</span>
                <span style={{ fontSize: 11, color: "var(--mt)", display: "inline-block", transition: "transform 0.2s", transform: showHoodPicker ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: 28, fontWeight: 900, background: "linear-gradient(90deg, #9D4EDD, #FF006E)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: -1, lineHeight: 1 }}>vybe</span>
                <span style={{ fontSize: 11, color: "var(--mt)", display: "inline-block", transition: "transform 0.2s", transform: showHoodPicker ? "rotate(180deg)" : "rotate(0deg)", marginTop: 4 }}>▾</span>
              </>
            )}
          </div>
          {showHoodPicker && (
            <>
              <div onClick={() => setShowHoodPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 16, minWidth: 210, maxHeight: 260, overflowY: "auto", zIndex: 50, boxShadow: "0 8px 32px #00000070", animation: "slideDown 0.18s ease" }}>
                <div onClick={() => { setSelectedHood(null); setShowHoodPicker(false); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "0.5px solid var(--bd)", cursor: "pointer" }}>
                  <span style={{ fontSize: 14, fontWeight: selectedHood === null ? 700 : 400, color: selectedHood === null ? "var(--p)" : "var(--txt)" }}>São Paulo, SP</span>
                  {selectedHood === null && <span style={{ color: "var(--p)", fontSize: 12 }}>✓</span>}
                </div>
                {hoods.map((hood) => (
                  <div key={hood} onClick={() => { setSelectedHood(hood); setShowHoodPicker(false); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "0.5px solid var(--bd)", cursor: "pointer" }}>
                    <span style={{ fontSize: 14, fontWeight: selectedHood === hood ? 700 : 400, color: selectedHood === hood ? "var(--p)" : "var(--txt)" }}>{hood}</span>
                    {selectedHood === hood && <span style={{ color: "var(--p)", fontSize: 12 }}>✓</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", alignItems: "center", color: "var(--mt)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
      </div>

      {/* Stories */}
      {(() => {
        const storySource = posts.length > 0 ? posts : DEMO_POSTS;
        const userStories: SelectedUser[] = [];
        storySource.forEach((p) => {
          if (p.profiles && !userStories.find((u) => u.id === p.user_id)) {
            userStories.push({ id: p.user_id, nome: p.profiles.nome, avatar_url: p.profiles.avatar_url, status: p.profiles.status ?? "solteiro" });
          }
        });
        const hasVenueStories = followsLoaded && visibleVenues.length > 0;
        const hasUserStories = userStories.length > 0;
        const showEmpty = followsLoaded && !hasVenueStories && !hasUserStories;

        if (loading || !followsLoaded) return (
          <div style={{ display: "flex", gap: 14, paddingBottom: 16, marginBottom: 8 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <div style={{ width: 58, height: 58, borderRadius: "50%", background: "#1E1E38" }} />
                <div style={{ width: 42, height: 8, borderRadius: 4, background: "#1E1E38" }} />
              </div>
            ))}
          </div>
        );

        if (showEmpty) return (
          <div style={{ marginBottom: 16, padding: "12px 0", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 58, height: 58, borderRadius: "50%", border: "1.5px dashed var(--bd)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>Siga rolês para ver stories</div>
              <div style={{ fontSize: 11, color: "var(--mt)", marginTop: 2 }}>Abra um bar e toque em + Seguir</div>
            </div>
          </div>
        );

        return (
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16, marginBottom: 8 }}>
            {visibleVenues.map((v) => (
              <div key={`v-${v.id}`} onClick={() => onVenuePress(v)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer" }}>
                <div style={{ padding: 2, borderRadius: "50%", background: "linear-gradient(135deg, #9D4EDD, #FF006E)" }}>
                  <div style={{ background: "var(--bg)", borderRadius: "50%", padding: 2 }}>
                    <VenueAvatar v={v} size={54} />
                  </div>
                </div>
                <span style={{ fontSize: 10, color: "var(--mt)", maxWidth: 58, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
              </div>
            ))}
            {userStories.map((u) => (
              <div key={`u-${u.id}`} onClick={() => onUserPress(u)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer" }}>
                <div style={{ padding: 2, borderRadius: "50%", background: "linear-gradient(135deg, #00D9FF, #9D4EDD)" }}>
                  <div style={{ background: "var(--bg)", borderRadius: "50%", padding: 2 }}>
                    <UserAvatar profile={u} size={54} />
                  </div>
                </div>
                <span style={{ fontSize: 10, color: "var(--mt)", maxWidth: 58, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nome.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Posts */}
      {(() => {
        const visiblePosts = posts.length > 0 ? posts : DEMO_POSTS;
        const isDemo = posts.length === 0;
        return (
          <div style={{ margin: "0 -20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {visiblePosts.map((p) => <RealPostCard key={p.id} post={p} onUserPress={onUserPress} />)}
          </div>
        );
      })()}
    </div>
  );
}

function RealPostCard({ post, onUserPress }: { post: RealPost; onUserPress: (u: SelectedUser) => void }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const nome = post.profiles?.nome ?? "Usuário";
  const badge = STATUS_OPTIONS.find((s) => s.key === (post.profiles?.status ?? "solteiro")) ?? STATUS_OPTIONS[0];
  const venueName = post.venues?.name ?? null;
  const venueTag = post.venues?.tags?.[0] ?? null;

  function handleUserPress() {
    onUserPress({ id: post.user_id, nome, avatar_url: post.profiles?.avatar_url, status: post.profiles?.status ?? "solteiro" });
  }

  return (
    <div style={{ background: "var(--card)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <div onClick={handleUserPress} style={{ cursor: "pointer" }}>
          <UserAvatar profile={post.profiles} size={40} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span onClick={handleUserPress} style={{ fontSize: 14, fontWeight: 800, color: "var(--txt)", cursor: "pointer" }}>{nome}</span>
            <div style={{ width: 14, height: 3, borderRadius: 2, background: badge.color, flexShrink: 0 }} />
          </div>
          {venueName && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <PinIcon size={10} color="var(--mt)" />
              <span style={{ fontSize: 11, color: "var(--mt)" }}>{venueName}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--mt)", fontSize: 11 }}>
          <ClockIcon size={11} color="var(--mt)" />
          <span>{timeLeft(post.expires_at)}</span>
        </div>
      </div>

      {/* Imagem */}
      <div style={{ width: "100%", aspectRatio: "4/5", overflow: "hidden" }}>
        <img src={post.image_url} alt="post" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>

      {/* Ações */}
      <div style={{ padding: "12px 14px 0", display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 18, flex: 1 }}>
          <button onClick={() => setLiked(!liked)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
            <HeartIcon filled={liked} size={26} color={liked ? "var(--pk)" : "var(--txt)"} />
          </button>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
            <CommentIcon size={24} color="var(--txt)" />
          </button>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
            <ShareIcon size={24} color="var(--txt)" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "8px 14px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--txt)", marginBottom: 2 }}>0 curtidas</div>
        <div style={{ fontSize: 12, color: "var(--mt)", marginBottom: 4 }}>Ver todos os comentários</div>
        <div style={{ fontSize: 11, color: "var(--mt)" }}>{timeSince(post.created_at)}</div>
      </div>
    </div>
  );
}

/* ── CAMERA MODAL (swipe da home) ── */
function CameraModal({ venues, profile, onClose, onPosted }: { venues: Venue[]; profile: Profile | null; onClose: () => void; onPosted: () => void }) {
  const [mode, setMode] = useState<"story" | "post">("story");
  const [step, setStep] = useState<"photo" | "details">("photo");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [venueQuery, setVenueQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [duration, setDuration] = useState<2 | 4 | 6 | 8>(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [geoStatus, setGeoStatus] = useState<"checking" | "ok" | "denied" | "far">("checking");

  useEffect(() => {
    if (!navigator.geolocation) { setGeoStatus("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const withCoords = venues.filter((v) => v.lat != null && v.lng != null);
        if (withCoords.length === 0) { setGeoStatus("ok"); return; }
        let nearest: Venue | null = null;
        let minDist = Infinity;
        for (const v of withCoords) {
          const d = haversine(latitude, longitude, v.lat!, v.lng!);
          if (d < minDist) { minDist = d; nearest = v; }
        }
        if (nearest && minDist <= 0.5) { setSelectedVenue(nearest); setGeoStatus("ok"); }
        else setGeoStatus("far");
      },
      () => setGeoStatus("denied"),
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

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

  async function handlePublish() {
    if (!selectedFile || !profile) return;
    setLoading(true); setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sem sessão");
      const ext = selectedFile.name.split(".").pop() ?? "jpg";
      const fileName = `${session.user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("posts").upload(fileName, selectedFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(fileName);
      const dur = mode === "story" ? 2 : duration;
      const expiresAt = new Date(Date.now() + dur * 3600000).toISOString();
      const { error: insertError } = await supabase.from("posts").insert({
        user_id: session.user.id,
        venue_id: selectedVenue?.id ?? null,
        image_url: publicUrl,
        duration: dur,
        expires_at: expiresAt,
      });
      if (insertError) throw insertError;
      onPosted();
    } catch { setError("Erro ao publicar. Tente novamente."); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 70, display: "flex", flexDirection: "column", animation: "slideFromLeft 0.22s ease" }}>
      <style>{`@keyframes slideFromLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "54px 20px 16px", gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--mt)", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        {/* Toggle Story / Post — só visível quando geo ok */}
        {geoStatus === "ok" && (
          <div style={{ display: "flex", background: "var(--card)", borderRadius: 12, padding: 3, gap: 2, flex: 1, maxWidth: 200, margin: "0 auto" }}>
            {(["story", "post"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setStep("photo"); setSelectedFile(null); setPreviewUrl(null); }}
                style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                  background: mode === m ? "var(--p)" : "transparent", color: mode === m ? "#fff" : "var(--mt)" }}>
                {m === "story" ? "Story" : "Post"}
              </button>
            ))}
          </div>
        )}

        {geoStatus === "ok" && step === "details" && (
          <button onClick={() => { setStep("photo"); setSelectedFile(null); setPreviewUrl(null); }}
            style={{ background: "none", border: "none", color: "var(--p)", fontSize: 13, cursor: "pointer" }}>
            Trocar
          </button>
        )}
      </div>

      {geoStatus === "ok" && mode === "story" && step === "photo" && (
        <div style={{ padding: "0 20px 8px", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "var(--mt)", background: "var(--card)", padding: "4px 12px", borderRadius: 20 }}>Dura 2h · visível para seus seguidores</span>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 40px" }}>

        {/* Estados de geolocalização */}
        {geoStatus === "checking" && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 80 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid var(--p)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
            <span style={{ color: "var(--mt)", fontSize: 14 }}>Verificando sua localização...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {geoStatus === "denied" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 80, textAlign: "center", padding: "80px 12px 0" }}>
            <PinIcon size={52} color="var(--mt)" />
            <div style={{ fontSize: 18, fontWeight: 900, color: "var(--txt)" }}>Localização necessária</div>
            <div style={{ fontSize: 14, color: "var(--mt)", lineHeight: 1.7 }}>
              Precisamos confirmar que você está fisicamente no rolê antes de publicar.<br/>Ative a localização nas configurações do seu celular e tente novamente.
            </div>
            <button className="btn-outline" onClick={onClose} style={{ marginTop: 8 }}>Fechar</button>
          </div>
        )}
        {geoStatus === "far" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 80, textAlign: "center", padding: "80px 12px 0" }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
            <div style={{ fontSize: 18, fontWeight: 900, color: "var(--txt)" }}>Você não está num rolê</div>
            <div style={{ fontSize: 14, color: "var(--mt)", lineHeight: 1.7 }}>
              No Vybe, só é possível postar quando você está fisicamente em um bar ou evento cadastrado.<br/>Vá curtir a noite e poste de lá!
            </div>
            <button className="btn-outline" onClick={onClose} style={{ marginTop: 8 }}>Fechar</button>
          </div>
        )}

        {geoStatus === "ok" && step === "photo" && (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "var(--card)", border: "2px dashed var(--bd)", borderRadius: 24, minHeight: 340, cursor: "pointer" }}>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />
            <CameraIcon size={56} color="var(--mt)" />
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--txt)" }}>Tirar foto</div>
            <div style={{ fontSize: 13, color: "var(--mt)" }}>Toque para abrir a câmera</div>
          </label>
        )}

        {geoStatus === "ok" && step === "details" && (
          <>
            {previewUrl && (
              <div style={{ borderRadius: 18, overflow: "hidden", marginBottom: 20, aspectRatio: "4/5" }}>
                <img src={previewUrl} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt="preview" />
              </div>
            )}

            {/* Venue */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "var(--txt)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <PinIcon size={13} color="var(--p)" /> Em qual rolê você está? {mode === "story" && <span style={{ color: "var(--mt)", fontWeight: 400 }}>(opcional)</span>}
              </div>
              {selectedVenue ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--pd)", border: "0.5px solid #9D4EDD44", borderRadius: 12, padding: "10px 14px" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--p)", flex: 1 }}>{selectedVenue.name}</span>
                  <span style={{ fontSize: 11, color: "var(--mt)" }}>{selectedVenue.hood}</span>
                  <button onClick={() => setSelectedVenue(null)} style={{ background: "none", border: "none", color: "var(--mt)", cursor: "pointer", fontSize: 14 }}>✕</button>
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

            {/* Duração — só para Post */}
            {mode === "post" && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "var(--txt)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <ClockIcon size={13} color="var(--p)" /> Por quanto tempo?
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {([2, 4, 6, 8] as const).map((h) => (
                    <button key={h} onClick={() => setDuration(h)} style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "0.5px solid", borderColor: duration === h ? "var(--p)" : "var(--bd)", background: duration === h ? "var(--pd)" : "var(--card)", color: duration === h ? "var(--p)" : "var(--mt)", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>{h}h</button>
                  ))}
                </div>
              </div>
            )}

            {mode === "story" && (
              <div style={{ marginBottom: 20, background: "var(--card)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <ClockIcon size={14} color="var(--mt)" />
                <span style={{ fontSize: 13, color: "var(--mt)" }}>Story expira em <strong style={{ color: "var(--txt)" }}>2 horas</strong></span>
              </div>
            )}

            {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}
            <button className="btn-primary" onClick={handlePublish}
              disabled={(mode === "post" && !selectedVenue) || loading}
              style={{ opacity: ((mode === "post" && !selectedVenue) || loading) ? 0.6 : 1 }}>
              {loading ? "Publicando..." : mode === "story" ? "Publicar story" : "Publicar post"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── BUSCAR ── */
const FILTER_TYPES = ["Balada", "Bar", "Pagode", "Sertanejo", "Eletrônica", "Boteco", "Show", "Rock", "Jazz", "Techno", "Funk", "MPB"];

function SearchTab({ venues, loading, userLocation, onVenuePress, onUserPress }: { venues: Venue[]; loading: boolean; userLocation: UserLocation | null; onVenuePress: (v: Venue) => void; onUserPress: (u: SelectedUser) => void }) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showFilter, setShowFilter] = useState(false);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterPrices, setFilterPrices] = useState<string[]>([]);
  const [filterOcc, setFilterOcc] = useState<string[]>([]);
  const [userResults, setUserResults] = useState<Profile[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) { setUserResults([]); return; }
    supabase.from("profiles").select("id, nome, bairro, status, avatar_url")
      .ilike("nome", `%${query.trim()}%`)
      .limit(6)
      .then(({ data }) => { if (data) setUserResults(data as Profile[]); });
  }, [query]);

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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.8" fill="var(--mt)"/><line x1="12" y1="12" x2="18.2" y2="5.8" strokeLinecap="round"/></svg>
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
            {/* People results */}
            {userResults.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, color: "var(--mt)", fontWeight: 900, letterSpacing: 1, marginBottom: 10 }}>PESSOAS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {userResults.map((u) => {
                    const badge = STATUS_OPTIONS.find((s) => s.key === (u.status ?? "solteiro")) ?? STATUS_OPTIONS[0];
                    return (
                      <div key={u.id} onClick={() => onUserPress({ id: u.id, nome: u.nome, avatar_url: u.avatar_url, status: u.status ?? "solteiro" })}
                        style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 16, padding: "12px 14px", cursor: "pointer" }}>
                        <UserAvatar profile={u} size={44} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--txt)" }}>{u.nome}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                            <div style={{ width: 14, height: 3, borderRadius: 2, background: badge.color }} />
                            <span style={{ fontSize: 11, color: "var(--mt)" }}>{badge.label}{u.bairro ? ` · ${u.bairro}` : ""}</span>
                          </div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {(filtered.length > 0 || activeFilters > 0) && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: "var(--mt)", fontWeight: 900, letterSpacing: 1 }}>{filtered.length} LUGARES</div>
                {activeFilters > 0 && <button onClick={clearFilters} style={{ background: "none", border: "none", color: "var(--p)", fontSize: 12, cursor: "pointer" }}>Limpar filtros</button>}
              </div>
            )}
            {filtered.map((v) => <VenueCard key={v.id} venue={v} userLocation={userLocation} onClick={() => onVenuePress(v)} />)}
            {filtered.length === 0 && userResults.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 40, color: "var(--mt)" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.8" fill="var(--mt)"/><line x1="12" y1="12" x2="18.2" y2="5.8" strokeLinecap="round"/></svg>
                </div>
                <div style={{ fontWeight: 900 }}>Nenhum resultado encontrado</div>
              </div>
            )}
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
  const [liked, setLiked] = useState(false);
  const [liveOcc, setLiveOcc] = useState(v.occ);
  const [showReport, setShowReport] = useState(false);
  const [reportOcc, setReportOcc] = useState<number | null>(null);
  const [reportFila, setReportFila] = useState<string | null>(null);
  const [reportDone, setReportDone] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  const dist = userLocation && v.lat && v.lng ? formatDist(haversine(userLocation.lat, userLocation.lng, v.lat, v.lng)) : null;

  async function submitReport() {
    if (reportOcc === null) return;
    setSubmittingReport(true);
    await supabase.from("venues").update({ occ: reportOcc }).eq("id", v.id);
    setLiveOcc(reportOcc);
    setSubmittingReport(false);
    setReportDone(true);
    setTimeout(() => { setShowReport(false); setReportDone(false); setReportOcc(null); setReportFila(null); }, 2000);
  }

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
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", flexDirection: "column", background: "var(--bg)" }}>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Hero cover */}
        <div style={{ position: "relative", width: "100%", height: 230, background: v.color + "20", overflow: "hidden", flexShrink: 0 }}>
          {v.image_url
            ? <img src={v.image_url} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80, fontWeight: 900, color: v.color, opacity: 0.2 }}>{v.initial}</div>
          }
          {/* Back button */}
          <button onClick={onClose} style={{ position: "absolute", top: 52, left: 16, width: 38, height: 38, borderRadius: "50%", background: "#00000070", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>←</button>
          {/* Like + Share overlaid top-right */}
          <div style={{ position: "absolute", top: 52, right: 16, display: "flex", gap: 8 }}>
            <button onClick={() => setLiked((l) => !l)} style={{ width: 38, height: 38, borderRadius: "50%", background: "#00000070", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
              <HeartIcon filled={liked} size={18} color={liked ? "var(--pk)" : "#fff"} />
            </button>
            <button style={{ width: 38, height: 38, borderRadius: "50%", background: "#00000070", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
              <ShareIcon size={18} color="#fff" />
            </button>
          </div>
          {/* Tags */}
          {(v.tags || []).length > 0 && (
            <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {(v.tags || []).map((t) => (
                <span key={t} style={{ background: "#00000075", color: "#fff", fontSize: 10, padding: "4px 10px", borderRadius: 20, fontWeight: 700, backdropFilter: "blur(6px)" }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Avatar + Name row */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, padding: "0 20px", marginTop: -20 }}>
          <div style={{ width: 82, height: 82, borderRadius: "50%", border: "3px solid var(--bg)", overflow: "hidden", background: v.color + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: v.color, flexShrink: 0 }}>
            {v.image_url ? <img src={v.image_url} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : v.initial}
          </div>
          <div style={{ flex: 1, paddingBottom: 6 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: "var(--txt)", lineHeight: 1.2 }}>{v.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--mt)" }}>{v.hood}</span>
              <span style={{ fontSize: 12, color: "var(--mt)" }}>·</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--txt)" }}>{followers}</span>
              <span style={{ fontSize: 12, color: "var(--mt)" }}>seguidores</span>
              {dist && (
                <>
                  <span style={{ fontSize: 12, color: "var(--mt)" }}>·</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cy)" }}>{dist}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Follow + Agenda buttons */}
        <div style={{ display: "flex", gap: 8, padding: "14px 20px 10px" }}>
          <button onClick={toggleFollow} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "0.5px solid", borderColor: isFollowing ? "var(--bd)" : "var(--p)", background: isFollowing ? "transparent" : "var(--p)", color: isFollowing ? "var(--txt)" : "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {isFollowing ? "✓ Seguindo" : "+ Seguir"}
          </button>
          <button onClick={() => setAgendaMsg(true)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "0.5px solid var(--bd)", background: "transparent", color: "var(--txt)", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <CalendarIcon size={15} /> Agenda
          </button>
        </div>

        {agendaMsg && (
          <>
            <div onClick={() => setAgendaMsg(false)} style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 80 }} />
            <div style={{ position: "fixed", left: 20, right: 20, top: "50%", transform: "translateY(-50%)", background: "var(--card)", borderRadius: 20, padding: 28, zIndex: 90, textAlign: "center" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <div style={{ fontSize: 18, fontWeight: 900, color: "var(--txt)", marginBottom: 8 }}>Agenda em breve</div>
              <div style={{ fontSize: 13, color: "var(--mt)", marginBottom: 20 }}>Os eventos dos estabelecimentos vão aparecer aqui em breve!</div>
              <button onClick={() => setAgendaMsg(false)} className="btn-primary">Entendido</button>
            </div>
          </>
        )}

        {/* Tabs — Instagram style */}
        <div style={{ display: "flex", borderTop: "0.5px solid var(--bd)", borderBottom: "0.5px solid var(--bd)", marginTop: 4 }}>
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
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><CameraIcon size={48} color="var(--mt)" /></div>
              <div style={{ fontWeight: 900, fontSize: 15, color: "var(--txt)", marginBottom: 8 }}>Nenhuma foto ainda</div>
              <div style={{ fontSize: 13 }}>Seja o primeiro a postar aqui!</div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Informações */}
      {activeTab === "info" && (
        <div style={{ padding: "20px 20px 48px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Lotação ao vivo */}
          {(() => { const { color: liveColor, label: liveLabel } = occInfo(liveOcc); return (
          <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5 }}>LOTAÇÃO AGORA</div>
              <span style={{ fontSize: 12, color: liveColor, fontWeight: 900 }}>{liveLabel} · {liveOcc}%</span>
            </div>
            <div style={{ background: "#1A1A35", borderRadius: 6, height: 8 }}>
              <div style={{ width: `${liveOcc}%`, background: liveColor, borderRadius: 6, height: 8, transition: "width 0.4s" }} />
            </div>
          </div>
          ); })()}

          {/* Botão Reportar ao vivo */}
          <button onClick={() => setShowReport(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 0", borderRadius: 14, border: "0.5px solid #9D4EDD55", background: "var(--pd)", color: "var(--p)", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4l3 3"/></svg>
            Reportar situação ao vivo
          </button>

          {/* Grid de info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, label: "Preço", value: v.price },
              { icon: <ClockIcon size={18} color="var(--mt)" />, label: "Fecha às", value: v.close_time || "—" },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>, label: "Transporte", value: v.transit || "—" },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="22" height="18" rx="2"/><path d="M1 9h22"/><path d="M1 15h22"/></svg>, label: "Estacionamento", value: v.parking ? "Disponível" : "Sem vaga" },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/><line x1="9" y1="12" x2="15" y2="12"/></svg>, label: "Entrada", value: v.entry || "Gratuita" },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 9V7a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M20 9H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z"/></svg>, label: "Assento", value: v.has_seat ? "Tem assento" : "Em pé" },
            ].map((item) => (
              <div key={item.label} style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontSize: 11, color: "var(--mt)", marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Endereço */}
          {v.address && (
            <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14 }}>
              <PinIcon size={20} color="var(--mt)" />
              <div>
                <div style={{ fontSize: 11, color: "var(--mt)", marginBottom: 4, letterSpacing: 0.5 }}>ENDEREÇO</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", lineHeight: 1.6 }}>{v.address}</div>
              </div>
            </div>
          )}

          {/* Cardápio */}
          <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5, marginBottom: 14 }}>CARDÁPIO</div>
            {v.menu && v.menu.length > 0 ? (
              Object.entries(
                v.menu.reduce((acc, item) => {
                  const cat = item.category || "Outros";
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(item);
                  return acc;
                }, {} as Record<string, typeof v.menu>)
              ).map(([category, items]) => (
                <div key={category} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: "var(--p)", letterSpacing: 0.5, marginBottom: 8 }}>{category.toUpperCase()}</div>
                  {(items as Array<{ name: string; price: string; category: string }>).map((item, i, arr) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < arr.length - 1 ? "0.5px solid var(--bd)" : "none" }}>
                      <span style={{ fontSize: 13, color: "var(--txt)", fontWeight: 600 }}>{item.name}</span>
                      <span style={{ fontSize: 13, color: "var(--p)", fontWeight: 900 }}>{item.price}</span>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: "var(--mt)", textAlign: "center", padding: "8px 0" }}>Cardápio em breve</div>
            )}
          </div>
        </div>
      )}

      </div>{/* end scrollable */}

      {/* Bottom sheet: Reportar ao vivo */}
      {showReport && (
        <>
          <div onClick={() => setShowReport(false)} style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 90 }} />
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "var(--surf)", borderRadius: "24px 24px 0 0", border: "0.5px solid var(--bd)", zIndex: 100, padding: "20px 20px 48px" }}>
            <div style={{ width: 36, height: 3, background: "var(--bd)", borderRadius: 2, margin: "0 auto 20px" }} />
            {reportDone ? (
              <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: "var(--txt)", marginBottom: 6 }}>Obrigado pelo report!</div>
                <div style={{ fontSize: 13, color: "var(--mt)" }}>A situação foi atualizada.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 17, fontWeight: 900, color: "var(--txt)", marginBottom: 4 }}>Como está o lugar agora?</div>
                <div style={{ fontSize: 12, color: "var(--mt)", marginBottom: 20 }}>Seu report ajuda todo mundo a decidir pra onde ir.</div>

                <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5, marginBottom: 10 }}>LOTAÇÃO</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  {[
                    { label: "Tranquilo", occ: 25, color: "#22C55E" },
                    { label: "Médio", occ: 55, color: "#F59E0B" },
                    { label: "Cheio", occ: 80, color: "#F59E0B" },
                    { label: "Lotado", occ: 95, color: "#EF4444" },
                  ].map((op) => (
                    <button key={op.label} onClick={() => setReportOcc(op.occ)}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1.5px solid ${reportOcc === op.occ ? op.color : "var(--bd)"}`, background: reportOcc === op.occ ? op.color + "20" : "var(--card)", color: reportOcc === op.occ ? op.color : "var(--mt)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                      {op.label}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5, marginBottom: 10 }}>FILA NA ENTRADA</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                  {["Sem fila", "Pequena", "Grande"].map((f) => (
                    <button key={f} onClick={() => setReportFila(f)}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1.5px solid ${reportFila === f ? "var(--p)" : "var(--bd)"}`, background: reportFila === f ? "var(--pd)" : "var(--card)", color: reportFila === f ? "var(--p)" : "var(--mt)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                      {f}
                    </button>
                  ))}
                </div>

                <button onClick={submitReport} disabled={reportOcc === null || submittingReport}
                  style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: reportOcc !== null ? "var(--p)" : "#1A1A35", color: reportOcc !== null ? "#fff" : "var(--mt)", fontWeight: 800, fontSize: 15, border: "none", cursor: reportOcc !== null ? "pointer" : "default", opacity: submittingReport ? 0.7 : 1 }}>
                  {submittingReport ? "Enviando..." : "Enviar report"}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Sticky bottom: Ir pra lá */}
      {v.address && (
        <div style={{ padding: "12px 20px 28px", background: "var(--bg)", borderTop: "0.5px solid var(--bd)", flexShrink: 0 }}>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "16px 0", borderRadius: 18, background: "linear-gradient(90deg, #9D4EDD, #7B2FBE)", color: "#fff", fontWeight: 800, fontSize: 16, textDecoration: "none" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            Ir pra lá
          </a>
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
function ChatTab({ myId }: { myId: string | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<SelectedUser | null>(null);

  async function fetchMessages() {
    if (!myId) { setLoading(false); return; }
    const { data } = await supabase
      .from("messages")
      .select("*, sender:profiles!sender_id(nome, avatar_url), receiver:profiles!receiver_id(nome, avatar_url)")
      .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setMessages(data as Message[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchMessages();
    if (!myId) return;
    const channel = supabase.channel(`chat-list-${myId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${myId}` }, fetchMessages)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myId]);

  // Agrupar por conversa
  const convMap = new Map<string, { partner: SelectedUser; lastMsg: Message; unread: number }>();
  [...messages].reverse().forEach((m) => {
    const isMe = m.sender_id === myId;
    const partnerId = isMe ? m.receiver_id : m.sender_id;
    const partnerProfile = isMe ? m.receiver : m.sender;
    const existing = convMap.get(partnerId);
    if (!existing) {
      convMap.set(partnerId, {
        partner: { id: partnerId, nome: partnerProfile?.nome ?? "Usuário", avatar_url: partnerProfile?.avatar_url ?? null, status: "solteiro" },
        lastMsg: m,
        unread: isMe ? 0 : 1,
      });
    } else {
      if (!isMe) existing.unread++;
      existing.lastMsg = m;
    }
  });
  const conversations = [...convMap.values()].sort((a, b) =>
    new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime()
  );

  if (selectedPartner && myId) {
    return <ConversationThread myId={myId} partner={selectedPartner} onBack={() => setSelectedPartner(null)} />;
  }

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)" }}>Mensagens</div>
        <div style={{ fontSize: 11, color: "var(--mt)", background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 20, padding: "4px 10px" }}>Somem em 8h</div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 84, background: "var(--card)", borderRadius: 20 }} />)}
        </div>
      ) : conversations.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 14 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <div style={{ fontSize: 16, fontWeight: 900, color: "var(--txt)", marginBottom: 8 }}>Nenhuma mensagem</div>
          <div style={{ fontSize: 13, color: "var(--mt)" }}>Toque em "Mensagem" no perfil de alguém para começar</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {conversations.map(({ partner, lastMsg, unread }) => (
            <div key={partner.id} onClick={() => setSelectedPartner(partner)}
              style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 20, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
              <UserAvatar profile={partner} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: "var(--txt)", marginBottom: 4 }}>{partner.nome}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {unread > 0 && <span style={{ fontSize: 12, color: "var(--p)", fontWeight: 700 }}>{unread}+ nova{unread > 1 ? "s" : ""} mensagem{unread > 1 ? "s" : ""}</span>}
                  {unread > 0 && <span style={{ color: "var(--mt)", fontSize: 12 }}>·</span>}
                  <span style={{ fontSize: 12, color: "var(--mt)" }}>{timeSince(lastMsg.created_at)}</span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mt)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── THREAD DE CONVERSA ── */
function ConversationThread({ myId, partner, onBack }: { myId: string; partner: SelectedUser; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchThread() {
    const { data } = await supabase.from("messages")
      .select("*")
      .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
      .or(`sender_id.eq.${partner.id},receiver_id.eq.${partner.id}`)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  }

  useEffect(() => {
    fetchThread();
    const channel = supabase.channel(`thread-${myId}-${partner.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        if ((m.sender_id === myId && m.receiver_id === partner.id) || (m.sender_id === partner.id && m.receiver_id === myId)) {
          setMessages((prev) => [...prev, m]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myId, partner.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    await supabase.from("messages").insert({
      sender_id: myId,
      receiver_id: partner.id,
      content: text.trim(),
      expires_at: new Date(Date.now() + 8 * 3600000).toISOString(),
    });
    setText("");
    setSending(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "54px 16px 14px", background: "var(--surf)", borderBottom: "0.5px solid var(--bd)", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--mt)", cursor: "pointer", display: "flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <UserAvatar profile={partner} size={38} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: "var(--txt)" }}>{partner.nome}</div>
          <div style={{ fontSize: 11, color: "var(--mt)" }}>Mensagens somem em 8h</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 40, color: "var(--mt)", fontSize: 13 }}>
            Envie a primeira mensagem para {partner.nome.split(" ")[0]}!
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.sender_id === myId;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "72%", padding: "10px 14px",
                borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isMe ? "var(--p)" : "var(--card)",
                border: isMe ? "none" : "0.5px solid var(--bd)",
                color: isMe ? "#fff" : "var(--txt)",
                fontSize: 14, lineHeight: 1.4,
              }}>
                <div>{m.content}</div>
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right" }}>{timeSince(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 16px 32px", background: "var(--surf)", borderTop: "0.5px solid var(--bd)", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Mensagem..."
          style={{ flex: 1, background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 22, padding: "12px 16px", color: "var(--txt)", fontSize: 14, outline: "none" }}
        />
        <button onClick={send} disabled={!text.trim() || sending}
          style={{ width: 44, height: 44, borderRadius: "50%", background: text.trim() ? "var(--p)" : "var(--card)", border: "none", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? "#fff" : "var(--mt)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── LOJA ── */
function LojaTab() {
  const myPts = 340;
  const rewards = [
    { n: "Drink grátis no Bar Brahma", pts: 200, icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--p)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 11l1.5-7.5L2 5l2 9a5 5 0 0 0 5 4h2a5 5 0 0 0 5-4z"/><path d="M8.5 2.5V5"/><path d="M16.5 5c0-1-1-2-2-2s-2 1-2 2 1 2 2 2 2-1 2-2z"/></svg> },
    { n: "1 like extra para dar", pts: 50, icon: <HeartIcon size={26} color="var(--p)" /> },
    { n: "Entrada grátis Cine Joia", pts: 500, icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--p)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/><line x1="9" y1="12" x2="15" y2="12"/></svg> },
    { n: "Fura-fila (1 uso)", pts: 150, icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--p)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
    { n: "Revelar curtida extra", pts: 100, icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--p)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/></svg> },
  ];
  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)", marginBottom: 16 }}>Lojinha</div>
      <div style={{ background: "#9D4EDD18", border: "0.5px solid #9D4EDD35", borderRadius: 16, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <StarIcon size={28} />
          <div>
            <div style={{ fontSize: 9, color: "var(--mt)", fontWeight: 900, letterSpacing: 1 }}>SEU SALDO</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "var(--p)" }}>{myPts} pts</div>
          </div>
        </div>
        <button style={{ background: "var(--pd)", color: "var(--p)", border: "0.5px solid #9D4EDD44", borderRadius: 12, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Histórico</button>
      </div>
      {/* Como ganhar pontos */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5, marginBottom: 12 }}>COMO GANHAR PONTOS</div>
        {[
          { label: "Escanear QR Code no bar parceiro", pts: "+50" },
          { label: "Postar no rolê", pts: "+20" },
          { label: "Primeiro post do dia", pts: "+30" },
          { label: "Ganhar um novo seguidor", pts: "+10" },
          { label: "Report de situação validado", pts: "+5" },
        ].map((item, i, arr) => (
          <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? "0.5px solid var(--bd)" : "none" }}>
            <span style={{ fontSize: 13, color: "var(--txt)" }}>{item.label}</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: "#22C55E" }}>{item.pts} pts</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, fontWeight: 900, color: "var(--txt)", letterSpacing: 0.5, marginBottom: 12 }}>RESGATAR PONTOS</div>
      {rewards.map((item) => (
        <div key={item.n} style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, padding: 14, marginBottom: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {item.icon}
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
  const [postCount, setPostCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showEdit, setShowEdit] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editTipos, setEditTipos] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const idx = STATUS_OPTIONS.findIndex((s) => s.key === profile.status);
    setStatusIdx(idx >= 0 ? idx : 0);
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", profile.id).gt("expires_at", new Date().toISOString())
      .then(({ count }) => setPostCount(count ?? 0));
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id)
      .then(({ count }) => setFollowerCount(count ?? 0));
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id)
      .then(({ count }) => setFollowingCount(count ?? 0));
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

  function openEdit() {
    setEditNome(profile?.nome ?? "");
    setEditTipos(profile?.tipos_favoritos ?? []);
    setShowEdit(true);
  }

  async function saveEdit() {
    if (!profile || !editNome.trim()) return;
    setSavingEdit(true);
    await supabase.from("profiles").update({ nome: editNome.trim(), tipos_favoritos: editTipos }).eq("id", profile.id);
    setProfile({ ...profile, nome: editNome.trim(), tipos_favoritos: editTipos });
    setSavingEdit(false);
    setShowEdit(false);
  }

  const nome = profile?.nome ?? "Carregando...";
  const bairro = profile?.bairro ?? "";
  const tipos = profile?.tipos_favoritos ?? [];

  return (
    <div style={{ padding: "16px 20px" }}>
      {/* Nome acima da foto */}
      <div style={{ fontSize: 16, fontWeight: 900, color: "var(--txt)", marginBottom: 14 }}>{nome}</div>

      {/* Avatar + Stats — estilo Instagram */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 16 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 86, height: 86, borderRadius: "50%", border: `3px solid ${STATUS_OPTIONS[statusIdx].color}`, overflow: "hidden", background: "var(--p)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900, color: "#fff" }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : nome.charAt(0).toUpperCase()
            }
          </div>
          <label style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: "var(--p)", border: "2px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
            {uploadingAvatar
              ? <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            }
          </label>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "space-around" }}>
          {[
            { v: String(postCount), l: "posts" },
            { v: String(followerCount), l: "seguidores" },
            { v: String(followingCount), l: "seguindo" },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "var(--txt)" }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "var(--mt)", marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom: 14 }}>
        <div onClick={handleStatusChange} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 20, padding: "5px 12px", cursor: "pointer" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_OPTIONS[statusIdx].color }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_OPTIONS[statusIdx].color }}>{STATUS_OPTIONS[statusIdx].label}</span>
        </div>
      </div>

      {/* Tipos favoritos */}
      {tipos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
          {tipos.map((t) => <span key={t} style={{ background: "var(--pd)", color: "var(--p)", fontSize: 12, padding: "4px 12px", borderRadius: 20, border: "0.5px solid #9D4EDD44", fontWeight: 700 }}>{t}</span>)}
        </div>
      )}

      {/* Editar perfil */}
      <button onClick={openEdit} style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "0.5px solid var(--bd)", background: "transparent", color: "var(--txt)", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 20 }}>
        Editar perfil
      </button>

      {/* Modal editar perfil */}
      {showEdit && (
        <>
          <div onClick={() => setShowEdit(false)} style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 200 }} />
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "var(--surf)", borderRadius: "24px 24px 0 0", border: "0.5px solid var(--bd)", zIndex: 210, padding: "20px 20px 48px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ width: 36, height: 3, background: "var(--bd)", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 17, fontWeight: 900, color: "var(--txt)", marginBottom: 20 }}>Editar perfil</div>

            <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5, marginBottom: 8 }}>NOME</div>
            <input
              className="inp"
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              placeholder="Seu nome"
              style={{ marginBottom: 20 }}
            />

            <div style={{ fontSize: 11, fontWeight: 900, color: "var(--mt)", letterSpacing: 0.5, marginBottom: 10 }}>ESTILOS FAVORITOS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {["Balada", "Bar", "Pagode", "Sertanejo", "Eletrônica", "Boteco", "Show", "Rock", "Jazz", "Techno", "Funk", "MPB"].map((t) => (
                <span key={t} onClick={() => setEditTipos((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                  style={{ padding: "8px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: editTipos.includes(t) ? 700 : 400, background: editTipos.includes(t) ? "var(--pd)" : "var(--card)", color: editTipos.includes(t) ? "var(--p)" : "var(--mt)", border: `0.5px solid ${editTipos.includes(t) ? "#9D4EDD" : "var(--bd)"}` }}>
                  {t}
                </span>
              ))}
            </div>

            <button onClick={saveEdit} disabled={savingEdit || !editNome.trim()} className="btn-primary" style={{ opacity: savingEdit ? 0.7 : 1 }}>
              {savingEdit ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </>
      )}

      {/* Galeria (premium) */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, padding: 20, marginBottom: 16, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><LockIcon size={28} color="var(--mt)" /></div>
        <div style={{ fontSize: 15, fontWeight: 900, color: "var(--txt)", marginBottom: 4 }}>Galeria de fotos</div>
        <div style={{ fontSize: 12, color: "var(--mt)", marginBottom: 14 }}>Disponível para assinantes Vybe+</div>
        <button style={{ background: "linear-gradient(135deg, #9D4EDD, #FF006E)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Assinar Vybe+</button>
      </div>

      {/* Menu */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--bd)", borderRadius: 18, overflow: "hidden" }}>
        {[
          { l: "Privacidade", icon: <LockIcon size={16} color="var(--mt)" /> },
          { l: "Notificações", icon: <BellIcon size={16} color="var(--mt)" /> },
          { l: "Suporte", icon: <CommentIcon size={16} color="var(--mt)" /> },
        ].map((item) => (
          <div key={item.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 16px", cursor: "pointer", borderBottom: "0.5px solid var(--bd)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {item.icon}
              <span style={{ fontSize: 14, color: "var(--txt)" }}>{item.l}</span>
            </div>
            <span style={{ color: "var(--mt)", fontSize: 18 }}>›</span>
          </div>
        ))}
        <div onClick={handleSignOut} style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 16px", cursor: "pointer" }}>
          <LogoutIcon size={16} color="#EF4444" />
          <span style={{ fontSize: 14, color: "#EF4444" }}>Sair da conta</span>
        </div>
      </div>
    </div>
  );
}

/* ── PERFIL DE OUTRO USUÁRIO ── */
function UserProfileModal({ user, onClose }: { user: SelectedUser; onClose: () => void }) {
  const [userPosts, setUserPosts] = useState<RealPost[]>([]);
  const [fullProfile, setFullProfile] = useState<Profile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [myId, setMyId] = useState<string | null>(null);
  const [showThread, setShowThread] = useState(false);
  const badge = STATUS_OPTIONS.find((s) => s.key === user.status) ?? STATUS_OPTIONS[0];

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", user.id).single()
      .then(({ data }) => { if (data) setFullProfile(data as Profile); });
    supabase.from("posts").select("*, venues(name, hood)").eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setUserPosts(data as RealPost[]); });
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", user.id)
      .then(({ count }) => setFollowerCount(count ?? 0));
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id)
      .then(({ count }) => setFollowingCount(count ?? 0));
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setMyId(session.user.id);
      supabase.from("user_follows").select("follower_id").eq("follower_id", session.user.id).eq("following_id", user.id).maybeSingle()
        .then(({ data }) => setIsFollowing(!!data));
    });
  }, [user.id]);

  async function toggleFollow() {
    if (!myId) return;
    if (isFollowing) {
      await supabase.from("user_follows").delete().eq("follower_id", myId).eq("following_id", user.id);
      setIsFollowing(false); setFollowerCount((c) => c - 1);
    } else {
      await supabase.from("user_follows").insert({ follower_id: myId, following_id: user.id });
      setIsFollowing(true); setFollowerCount((c) => c + 1);
    }
  }

  if (showThread && myId) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 80 }}>
        <ConversationThread myId={myId} partner={user} onBack={() => setShowThread(false)} />
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 70, overflowY: "auto" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "52px 16px 12px" }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--card)", border: "0.5px solid var(--bd)", color: "var(--txt)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>←</button>
      </div>

      {/* Avatar + Stats */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "8px 20px 16px" }}>
        <div style={{ width: 86, height: 86, borderRadius: "50%", border: `3px solid ${badge.color}`, overflow: "hidden", background: "var(--p)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt={user.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : user.nome.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "space-around" }}>
          {[
            { v: userPosts.length, l: "posts" },
            { v: followerCount, l: "seguidores" },
            { v: followingCount, l: "seguindo" },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "var(--txt)" }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "var(--mt)", marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nome, bairro, tags */}
      <div style={{ padding: "0 20px 4px" }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: "var(--txt)", marginBottom: 8 }}>{user.nome}</div>
        {fullProfile?.bairro && (
          <div style={{ fontSize: 13, color: "var(--mt)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <PinIcon size={12} color="var(--mt)" /> {fullProfile.bairro}
          </div>
        )}
        {fullProfile?.tipos_favoritos && fullProfile.tipos_favoritos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
            {fullProfile.tipos_favoritos.map((t) => (
              <span key={t} style={{ background: "var(--pd)", color: "var(--p)", fontSize: 11, padding: "3px 10px", borderRadius: 20, border: "0.5px solid #9D4EDD44", fontWeight: 700 }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Botões Seguir + Mensagem */}
      <div style={{ display: "flex", gap: 8, padding: "12px 20px 8px" }}>
        <button onClick={toggleFollow} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "0.5px solid", borderColor: isFollowing ? "var(--bd)" : "var(--p)", background: isFollowing ? "transparent" : "var(--p)", color: isFollowing ? "var(--txt)" : "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {isFollowing ? "✓ Seguindo" : "+ Seguir"}
        </button>
        <button onClick={() => myId && setShowThread(true)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "0.5px solid var(--bd)", background: "transparent", color: "var(--txt)", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Mensagem
        </button>
      </div>

      <div style={{ borderTop: "0.5px solid var(--bd)", marginTop: 8 }} />

      {userPosts.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, paddingBottom: 48 }}>
          {userPosts.map((p) => (
            <div key={p.id} style={{ aspectRatio: "1", overflow: "hidden", position: "relative" }}>
              <img src={p.image_url} alt="post" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", bottom: 4, right: 4, background: "#00000080", borderRadius: 8, padding: "2px 6px", fontSize: 9, color: "#fff", fontWeight: 700 }}>{timeLeft(p.expires_at)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--mt)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><CameraIcon size={48} color="var(--mt)" /></div>
          <div style={{ fontWeight: 900, fontSize: 15, color: "var(--txt)", marginBottom: 8 }}>Nenhum post ativo</div>
          <div style={{ fontSize: 13 }}>Quando {user.nome.split(" ")[0]} postar, vai aparecer aqui!</div>
        </div>
      )}
    </div>
  );
}

