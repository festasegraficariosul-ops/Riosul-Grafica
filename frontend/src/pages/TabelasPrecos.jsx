import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Share2, Image as ImageIcon, Download } from "lucide-react";
import { brl } from "@/lib/format";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function TabelasPrecos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tables, setTables] = useState([]);
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(null);
  const [showGen, setShowGen] = useState(null);
  const load = () => api.get("/price-tables").then(r => setTables(r.data));
  useEffect(() => { load(); api.get("/categories").then(r => setCats(r.data)); api.get("/products").then(r => setProducts(r.data.filter(p => p.active))); }, []);

  const upload = async (file) => {
    const fd = new FormData(); fd.append("file", file);
    const { data } = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
    return data.url;
  };
  const save = async () => {
    if (!form.title) return toast.error("Título obrigatório");
    if (form.id) await api.put(`/price-tables/${form.id}`, form);
    else await api.post("/price-tables", form);
    setForm(null); load(); toast.success("Salvo");
  };
  const del = async (id) => { if (!confirm("Excluir?")) return; await api.delete(`/price-tables/${id}`); load(); };
  const copyImg = async (url) => {
    try {
      const r = await fetch(url); const blob = await r.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success("Copiado! Cole no WhatsApp");
    } catch { toast.error("Navegador não suporta copiar imagem"); }
  };
  const share = async (t) => {
    const url = `${window.location.origin}${t.image_url}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
    catch { toast.error("Não foi possível copiar link"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tabelas de Preços</h1>
        {isAdmin && <div className="flex gap-2">
          <button onClick={() => setShowGen({ category_id: cats[0]?.id })} className="bg-yellow-500 text-zinc-950 px-3 py-2 rounded text-sm font-bold flex items-center gap-1"><ImageIcon size={14} /> Gerar do catálogo</button>
          <button onClick={() => setForm({ title: "", image_url: "", active: true })} className="bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold px-4 py-2 rounded text-sm flex items-center gap-1"><Plus size={14} /> Nova tabela</button>
        </div>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tables.map((t) => (
          <div key={t.id} className="card-riosul overflow-hidden">
            {t.image_url ? (
              <img src={t.image_url} alt={t.title} className="w-full h-64 object-cover bg-white" />
            ) : <div className="w-full h-64 bg-zinc-900 flex items-center justify-center text-zinc-600">Sem imagem</div>}
            <div className="p-3 space-y-2">
              <div className="text-sm font-bold text-white">{t.title}</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => copyImg(t.image_url)} className="bg-cyan-500 text-white text-xs font-bold px-2 py-1.5 rounded flex items-center gap-1"><Copy size={12} /> Copiar</button>
                <a href={t.image_url} download={t.title + ".png"} className="bg-zinc-800 text-white text-xs font-bold px-2 py-1.5 rounded flex items-center gap-1"><Download size={12} /> Baixar</a>
                <button onClick={() => share(t)} className="bg-zinc-800 text-white text-xs font-bold px-2 py-1.5 rounded flex items-center gap-1"><Share2 size={12} /> Link</button>
                {isAdmin && <>
                  <button onClick={() => setForm(t)} className="bg-zinc-800 text-white text-xs px-2 py-1.5 rounded">Editar</button>
                  <button onClick={() => del(t.id)} className="bg-red-500/90 text-white text-xs px-2 py-1.5 rounded"><Trash2 size={12} /></button>
                </>}
              </div>
            </div>
          </div>
        ))}
        {tables.length === 0 && <div className="col-span-full text-center text-zinc-500 py-10">Nenhuma tabela ainda. Faça upload da arte pronta ou gere automaticamente a partir do catálogo.</div>}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="card-riosul p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-3">{form.id ? "Editar" : "Nova"} tabela</h3>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título" className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm mb-2" />
            <select value={form.category_id || ""} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm mb-2">
              <option value="">Sem categoria</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="w-full block bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm mb-2 cursor-pointer">
              {form.image_url ? "Trocar imagem" : "Selecionar imagem"}
              <input type="file" accept="image/*" hidden onChange={async (e) => { if (e.target.files[0]) { const url = await upload(e.target.files[0]); setForm({ ...form, image_url: url }); } }} />
            </label>
            {form.image_url && <img src={form.image_url} alt="preview" className="w-full h-48 object-contain bg-white rounded mb-2" />}
            <button onClick={save} className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold py-2 rounded">Salvar</button>
          </div>
        </div>
      )}

      {showGen && <GenerateModal cats={cats} products={products} onClose={() => setShowGen(null)} onSaved={() => { setShowGen(null); load(); }} />}
    </div>
  );
}

function GenerateModal({ cats, products, onClose, onSaved }) {
  const [catId, setCatId] = useState(cats[0]?.id);
  const [busy, setBusy] = useState(false);
  const cat = cats.find(c => c.id === catId);
  const prods = products.filter(p => p.category_id === catId);

  const saveGenerated = async () => {
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 900; canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      // Background
      ctx.fillStyle = "#09090B"; ctx.fillRect(0, 0, 900, 1200);
      // Header
      ctx.fillStyle = "#EC4899"; ctx.fillRect(0, 0, 900, 8);
      // Logo (draw text)
      const logo = new Image(); logo.crossOrigin = "anonymous"; logo.src = "/riosul-logo.png";
      await new Promise((r) => { logo.onload = r; logo.onerror = r; });
      try { ctx.drawImage(logo, 40, 50, 200, 100); } catch {}
      // Title
      ctx.fillStyle = "#fff"; ctx.font = "bold 46px Outfit, sans-serif";
      ctx.textAlign = "right"; ctx.fillText("TABELA DE PREÇOS", 860, 90);
      ctx.fillStyle = "#EAB308"; ctx.font = "bold 34px Outfit, sans-serif";
      ctx.fillText((cat?.name || "").toUpperCase(), 860, 130);
      // Line
      ctx.strokeStyle = "#EC4899"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(40, 180); ctx.lineTo(860, 180); ctx.stroke();
      // Products
      ctx.textAlign = "left";
      let y = 230;
      prods.forEach((p) => {
        if (y > 1100) return;
        ctx.fillStyle = "#18181b"; ctx.fillRect(40, y - 30, 820, 60);
        ctx.strokeStyle = "#27272a"; ctx.strokeRect(40, y - 30, 820, 60);
        ctx.fillStyle = "#fff"; ctx.font = "bold 22px Plus Jakarta Sans, sans-serif";
        ctx.fillText(p.name, 60, y);
        ctx.fillStyle = "#06B6D4"; ctx.font = "18px Plus Jakarta Sans, sans-serif";
        const sub = p.price_type === "per_m2" ? `${brl(p.m2_price)}/m²` : (p.variations?.length ? `${p.variations.length} variações` : brl(p.price));
        ctx.textAlign = "right"; ctx.fillStyle = "#EAB308"; ctx.font = "bold 24px JetBrains Mono, monospace";
        ctx.fillText(sub, 840, y);
        ctx.textAlign = "left";
        y += 70;
      });
      // Footer
      ctx.fillStyle = "#71717a"; ctx.font = "16px Plus Jakarta Sans, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("@graficariosul · Faça seu orçamento!", 450, 1170);

      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      const fd = new FormData(); fd.append("file", new File([blob], `tabela_${cat?.name || "geral"}.png`, { type: "image/png" }));
      const { data } = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await api.post("/price-tables", { title: `Tabela ${cat?.name || ""}`, category_id: catId, image_url: data.url, active: true });
      toast.success("Tabela gerada");
      onSaved();
    } catch (e) { toast.error("Erro ao gerar"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-riosul p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-3">Gerar tabela do catálogo</h3>
        <select value={catId} onChange={(e) => setCatId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm mb-3">
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="text-xs text-zinc-500 mb-3">{prods.length} produtos serão incluídos com preços atuais do catálogo.</div>
        <button onClick={saveGenerated} disabled={busy} className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold py-2 rounded disabled:opacity-50">
          {busy ? "Gerando..." : "Gerar e salvar"}
        </button>
      </div>
    </div>
  );
}
