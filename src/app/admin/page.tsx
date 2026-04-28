"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "brunoknk173@icloud.com";

const EMPTY_FORM = {
  name: "", hood: "", address: "", tags: "", price: "$$",
  close_time: "", entry: "Grátis", parking: false, transit: "",
  has_seat: false, vibe_type: "resenha", color: "#9D4EDD", initial: "", occ: 0,
  image_url: "",
};

type Venue = typeof EMPTY_FORM & { id: number; status: string };

type Tab = "pendentes" | "aprovados" | "adicionar";

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [tab, setTab] = useState<Tab>("pendentes");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email === ADMIN_EMAIL) {
        setAuthorized(true);
        loadVenues();
      } else {
        setAuthorized(false);
      }
    });
  }, []);

  async function loadVenues() {
    const { data } = await supabase.from("venues").select("*").order("id");
    if (data) setVenues(data as Venue[]);
  }

  async function handleApprove(id: number) {
    await supabase.from("venues").update({ status: "aprovado" }).eq("id", id);
    loadVenues();
  }

  async function handleReject(id: number) {
    if (!confirm("Remover este lugar?")) return;
    await supabase.from("venues").delete().eq("id", id);
    loadVenues();
  }

  function handleEdit(v: Venue) {
    setForm({ ...v, tags: Array.isArray(v.tags) ? v.tags.join(", ") : v.tags });
    setEditingId(v.id);
    setTab("adicionar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name || !form.hood || !form.initial) {
      setMsg("Nome, bairro e sigla são obrigatórios.");
      return;
    }
    setLoading(true);
    setMsg("");

    const payload = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      occ: Number(form.occ),
    };

    if (editingId) {
      await supabase.from("venues").update(payload).eq("id", editingId);
      setMsg("Lugar atualizado!");
    } else {
      await supabase.from("venues").insert({ ...payload, status: "aprovado" });
      setMsg("Lugar adicionado!");
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    setLoading(false);
    loadVenues();
    setTab("aprovados");
  }

  function handleCancel() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setMsg("");
    setTab("aprovados");
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("venues").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("venues").getPublicUrl(path);
      set("image_url", data.publicUrl);
    }
    setUploading(false);
  }

  const pendentes = venues.filter((v) => v.status === "pendente");
  const aprovados = venues.filter((v) => v.status === "aprovado");

  if (authorized === null) return (
    <div style={{ minHeight: "100vh", background: "#08080F", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #9D4EDD", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!authorized) return (
    <div style={{ minHeight: "100vh", background: "#08080F", display: "flex", alignItems: "center", justifyContent: "center", color: "#F0F0FA", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <div style={{ fontWeight: 900, fontSize: 18 }}>Acesso negado</div>
      <div style={{ color: "#6060A0", fontSize: 14 }}>Somente o admin pode acessar esta página.</div>
    </div>
  );

  const inputStyle = { background: "#12122A", border: "0.5px solid #1E1E38", borderRadius: 10, padding: "10px 14px", color: "#F0F0FA", fontSize: 14, outline: "none", width: "100%" };
  const labelStyle = { fontSize: 11, color: "#6060A0", fontWeight: 700, letterSpacing: 1, display: "block", marginBottom: 5 } as React.CSSProperties;

  return (
    <div style={{ minHeight: "100vh", background: "#08080F", color: "#F0F0FA", padding: "32px 20px 60px", maxWidth: 700, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Painel Admin</div>
          <div style={{ fontSize: 13, color: "#6060A0", marginTop: 2 }}>Gerenciar lugares do Vybe</div>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
          style={{ background: "#1E1E38", border: "none", color: "#6060A0", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}>
          Sair
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {([
          { id: "pendentes", label: `Validar (${pendentes.length})` },
          { id: "aprovados", label: `Aprovados (${aprovados.length})` },
          { id: "adicionar", label: editingId ? "✏️ Editando" : "➕ Adicionar" },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id !== "adicionar") { setEditingId(null); setForm(EMPTY_FORM); setMsg(""); } }}
            style={{ padding: "9px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: tab === t.id ? "#9D4EDD" : "#0E0E1C", color: tab === t.id ? "#fff" : "#6060A0", transition: "all 0.15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PENDENTES ── */}
      {tab === "pendentes" && (
        <div>
          {pendentes.length === 0 ? (
            <div style={{ textAlign: "center", color: "#6060A0", paddingTop: 60 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 900 }}>Tudo validado!</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Nenhum lugar pendente.</div>
            </div>
          ) : (
            pendentes.map((v) => (
              <div key={v.id} style={{ background: "#0E0E1C", border: "0.5px solid #F59E0B44", borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: v.color + "25", border: `1.5px solid ${v.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: v.color, flexShrink: 0, overflow: "hidden" }}>
                    {v.image_url ? <img src={v.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : v.initial}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: "#6060A0", marginTop: 2 }}>{v.hood} · {Array.isArray(v.tags) ? v.tags.join(", ") : v.tags}</div>
                  </div>
                  <span style={{ fontSize: 10, background: "#F59E0B20", color: "#F59E0B", padding: "3px 8px", borderRadius: 10, fontWeight: 700 }}>PENDENTE</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[
                    { l: "Entrada", v: v.entry },
                    { l: "Preço", v: v.price },
                    { l: "Fecha", v: v.close_time || "—" },
                    { l: "Estac.", v: v.parking ? "✓ Sim" : "✗ Não" },
                    { l: "Assento", v: v.has_seat ? "✓ Sim" : "✗ Não" },
                    { l: "Vibe", v: v.vibe_type },
                  ].map((item) => (
                    <div key={item.l} style={{ background: "#12122A", borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 9, color: "#6060A0", fontWeight: 700, marginBottom: 3 }}>{item.l.toUpperCase()}</div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{item.v}</div>
                    </div>
                  ))}
                </div>

                {v.address && <div style={{ fontSize: 12, color: "#6060A0", marginBottom: 12 }}>📍 {v.address}</div>}
                {v.transit && <div style={{ fontSize: 12, color: "#6060A0", marginBottom: 14 }}>🚇 {v.transit}</div>}

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleApprove(v.id)} style={{ flex: 1, background: "#22C55E20", border: "0.5px solid #22C55E50", color: "#22C55E", borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ✓ Aprovar
                  </button>
                  <button onClick={() => handleEdit(v)} style={{ background: "#9D4EDD20", border: "0.5px solid #9D4EDD50", color: "#9D4EDD", borderRadius: 10, padding: "11px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => handleReject(v.id)} style={{ background: "#EF444420", border: "0.5px solid #EF444450", color: "#EF4444", borderRadius: 10, padding: "11px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ✗
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── APROVADOS ── */}
      {tab === "aprovados" && (
        <div>
          {aprovados.length === 0 ? (
            <div style={{ textAlign: "center", color: "#6060A0", paddingTop: 60 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🏙️</div>
              <div>Nenhum lugar aprovado ainda.</div>
            </div>
          ) : (
            aprovados.map((v) => (
              <div key={v.id} style={{ background: "#0E0E1C", border: "0.5px solid #1E1E38", borderRadius: 14, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: v.color + "25", border: `1.5px solid ${v.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: v.color, flexShrink: 0, overflow: "hidden" }}>
                  {v.image_url ? <img src={v.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : v.initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: "#6060A0", marginTop: 2 }}>{v.hood} · {v.entry} · {v.price}</div>
                </div>
                <button onClick={() => handleEdit(v)} style={{ background: "#1E1E38", border: "none", color: "#9D4EDD", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Editar</button>
                <button onClick={() => handleReject(v.id)} style={{ background: "#EF444420", border: "none", color: "#EF4444", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Remover</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ADICIONAR / EDITAR ── */}
      {tab === "adicionar" && (
        <div style={{ background: "#0E0E1C", border: "0.5px solid #1E1E38", borderRadius: 18, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 18 }}>
            {editingId ? "✏️ Editar lugar" : "➕ Novo lugar"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>NOME *</label>
              <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Cine Joia" />
            </div>
            <div>
              <label style={labelStyle}>SIGLA (2 letras) *</label>
              <input style={inputStyle} value={form.initial} onChange={(e) => set("initial", e.target.value.toUpperCase().slice(0, 2))} placeholder="Ex: CJ" />
            </div>
            <div>
              <label style={labelStyle}>BAIRRO *</label>
              <input style={inputStyle} value={form.hood} onChange={(e) => set("hood", e.target.value)} placeholder="Ex: Liberdade" />
            </div>
            <div>
              <label style={labelStyle}>ENDEREÇO</label>
              <input style={inputStyle} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Ex: Av. Brig. Luis Antonio, 82" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>TAGS (separadas por vírgula)</label>
              <input style={inputStyle} value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Ex: Eletrônica, House, Techno" />
            </div>
            <div>
              <label style={labelStyle}>PREÇO</label>
              <select style={inputStyle} value={form.price} onChange={(e) => set("price", e.target.value)}>
                <option>$</option><option>$$</option><option>$$$</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>ENTRADA</label>
              <input style={inputStyle} value={form.entry} onChange={(e) => set("entry", e.target.value)} placeholder="Ex: Grátis ou R$50" />
            </div>
            <div>
              <label style={labelStyle}>FECHA ÀS</label>
              <input style={inputStyle} value={form.close_time} onChange={(e) => set("close_time", e.target.value)} placeholder="Ex: 05:00" />
            </div>
            <div>
              <label style={labelStyle}>TRANSPORTE PRÓXIMO</label>
              <input style={inputStyle} value={form.transit} onChange={(e) => set("transit", e.target.value)} placeholder="Ex: Metrô Liberdade (300m)" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>FOTO DO LUGAR</label>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: form.image_url ? "transparent" : form.color + "25", border: `1.5px solid ${form.color}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: form.color }}>
                  {form.image_url
                    ? <img src={form.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : form.initial || "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <input type="file" accept="image/*" id="img-upload" style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                  <label htmlFor="img-upload" style={{ display: "inline-block", background: "#1E1E38", color: "#9D4EDD", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {uploading ? "Enviando..." : form.image_url ? "Trocar foto" : "Escolher foto"}
                  </label>
                  {form.image_url && (
                    <button onClick={() => set("image_url", "")} style={{ marginLeft: 8, background: "none", border: "none", color: "#EF4444", fontSize: 12, cursor: "pointer" }}>remover</button>
                  )}
                  <div style={{ fontSize: 11, color: "#6060A0", marginTop: 5 }}>JPG ou PNG · máx. 2MB</div>
                </div>
              </div>
              <label style={{ ...labelStyle, marginTop: 14 }}>COR DO AVATAR (usada quando não há foto)</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["#9D4EDD", "#FF006E", "#00D9FF", "#F59E0B", "#22C55E"].map((c) => (
                  <div key={c} onClick={() => set("color", c)} style={{ width: 32, height: 32, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "3px solid #fff" : "3px solid transparent" }} />
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>LOTAÇÃO ATUAL (0–100)</label>
              <input style={inputStyle} type="number" min={0} max={100} value={form.occ} onChange={(e) => set("occ", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            {[
              { key: "parking", label: "Estacionamento próximo" },
              { key: "has_seat", label: "Lugares para sentar" },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => set(key, !(form as Record<string, unknown>)[key])}>
                <div style={{ width: 20, height: 20, borderRadius: 5, background: (form as Record<string, unknown>)[key] ? "#9D4EDD" : "#1E1E38", border: "0.5px solid #2E2E50", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                  {(form as Record<string, unknown>)[key] ? "✓" : ""}
                </div>
                <span style={{ fontSize: 13, color: "#6060A0" }}>{label}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => set("vibe_type", form.vibe_type === "paquera" ? "resenha" : "paquera")}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: form.vibe_type === "paquera" ? "#FF006E" : "#1E1E38", border: "0.5px solid #2E2E50", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                {form.vibe_type === "paquera" ? "✓" : ""}
              </div>
              <span style={{ fontSize: 13, color: "#6060A0" }}>Vibe paquera</span>
            </div>
          </div>

          {msg && <div style={{ marginTop: 14, fontSize: 13, color: msg.includes("!") ? "#22C55E" : "#EF4444", textAlign: "center" }}>{msg}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={handleSave} disabled={loading} style={{ flex: 1, background: "#9D4EDD", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar lugar"}
            </button>
            <button onClick={handleCancel} style={{ background: "#1E1E38", color: "#6060A0", border: "none", borderRadius: 12, padding: "14px 18px", fontSize: 14, cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
