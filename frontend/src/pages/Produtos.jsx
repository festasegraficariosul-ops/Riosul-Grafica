import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { brl } from "@/lib/format";
import { Plus, Trash2, Edit, Upload, X, Star, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";


const PRICE_TYPES = [{v:"fixed",l:"Preço fixo"},{v:"variable",l:"Preço informado na venda"},{v:"per_m2",l:"Por m²"}];

export default function Produtos() {
  const [list, setList] = useState([]);
  const [cats, setCats] = useState([]);
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [importOpen, setImportOpen] = useState(false);


  const load = () => api.get("/products").then((r) => setList(r.data));
  useEffect(() => { load(); api.get("/categories").then(r => setCats(r.data)); api.get("/units").then(r => setUnits(r.data)); }, []);

  const newProduct = () => setForm({ name: "", category_id: cats[0]?.id, description: "", price: 0, price_type: "fixed", unit: "Unidade", sku: "", active: true, order: 0, variations: [], m2_min_price: 0, m2_price: 0, image_url: "", favorite: false, is_starting_price: false });

  const toggleFav = async (p) => { await api.put(`/products/${p.id}/favorite`, { favorite: !p.favorite }); load(); };

  const save = async () => {
    if (!form.name || !form.category_id) return toast.error("Nome e categoria obrigatórios");
    try {
      if (form.id) await api.put(`/products/${form.id}`, form);
      else await api.post("/products", form);
      toast.success("Salvo"); setForm(null); load();
    } catch (e) { toast.error("Erro ao salvar"); }
  };

  const del = async (id) => { if (!confirm("Desativar produto?")) return; await api.delete(`/products/${id}`); load(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Produtos</h1>
        <div className="flex gap-2">
          {isAdmin && <button onClick={() => setImportOpen(true)} data-testid="import-open" className="bg-zinc-800 text-white px-3 py-2 rounded text-sm flex items-center gap-1"><Upload size={14} /> Importar</button>}
          <button onClick={newProduct} data-testid="new-product" className="bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold px-4 py-2 rounded text-sm flex items-center gap-1"><Plus size={14} /> Novo</button>
        </div>
      </div>
      <div className="card-riosul overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-zinc-500 uppercase"><tr><th className="text-left px-3 py-2">Img</th><th className="text-left">Produto</th><th>Categoria</th><th>Preço</th><th>Tipo</th><th>Var.</th><th>Fav</th><th></th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className={`border-t border-zinc-800/60 ${!p.active ? "opacity-50" : ""}`}>
                <td className="px-3 py-2">{p.image_url ? <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 rounded bg-zinc-900" />}</td>
                <td className="text-white">{p.name}</td>
                <td className="text-zinc-400">{cats.find(c => c.id === p.category_id)?.name}</td>
                <td className="text-yellow-400 font-mono">{p.price_type === "fixed" ? brl(p.price) : PRICE_TYPES.find(t => t.v === p.price_type)?.l}</td>
                <td className="text-zinc-400 text-xs">{p.price_type}</td>
                <td className="text-zinc-400 text-xs">{p.variations?.length || 0}</td>
                <td><button onClick={() => toggleFav(p)}><Star size={16} className={p.favorite ? "text-yellow-400 fill-yellow-400" : "text-zinc-600"} /></button></td>
                <td className="text-right pr-3"><button onClick={() => setForm(p)} className="text-cyan-400 mr-2"><Edit size={14} /></button>{isAdmin && <button onClick={() => del(p.id)} className="text-red-400"><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && <ProductModal form={form} setForm={setForm} onClose={() => setForm(null)} onSave={save} cats={cats} units={units} />}
      {importOpen && <ImportModal onClose={() => { setImportOpen(false); load(); }} />}
    </div>
  );
}

function ProductModal({ form, setForm, onClose, onSave, cats, units }) {
  const addVar = () => setForm({ ...form, variations: [...(form.variations || []), { name: "", price: 0, active: true }] });
  const updVar = (i, k, v) => { const c = [...form.variations]; c[i][k] = v; setForm({ ...form, variations: c }); };
  const delVar = (i) => setForm({ ...form, variations: form.variations.filter((_, j) => j !== i) });
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-riosul p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between mb-4"><h3 className="text-xl font-bold text-white">{form.id ? "Editar" : "Novo"} produto</h3><button onClick={onClose} className="text-zinc-400"><X /></button></div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2"><label className="text-xs text-zinc-500">Nome</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" data-testid="prod-name" /></div>
          <div><label className="text-xs text-zinc-500">Categoria</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white">
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div><label className="text-xs text-zinc-500">Unidade</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white">
              {units.map(u => <option key={u.id}>{u.name}</option>)}
            </select></div>
          <div><label className="text-xs text-zinc-500">Tipo de preço</label>
            <select value={form.price_type} onChange={(e) => setForm({ ...form, price_type: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white">
              {PRICE_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select></div>
          <div><label className="text-xs text-zinc-500">Preço padrão</label><input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" /></div>
          {form.price_type === "per_m2" && (<>
            <div><label className="text-xs text-zinc-500">Preço por m²</label><input type="number" step="0.01" value={form.m2_price} onChange={(e) => setForm({ ...form, m2_price: Number(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" /></div>
            <div><label className="text-xs text-zinc-500">Valor mínimo</label><input type="number" step="0.01" value={form.m2_min_price} onChange={(e) => setForm({ ...form, m2_min_price: Number(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" /></div>
          </>)}
          <div className="col-span-2"><label className="text-xs text-zinc-500">Descrição</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" /></div>
          <div className="col-span-2">
            <label className="text-xs text-zinc-500">URL da imagem</label>
            <div className="flex gap-2">
              <input value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://... ou faça upload" className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" />
              <label className="cursor-pointer bg-cyan-500 text-white text-xs font-bold px-3 rounded flex items-center gap-1">
                <Upload size={12} /> Upload
                <input type="file" accept="image/*" hidden onChange={async (e) => {
                  const f = e.target.files[0]; if (!f) return;
                  const fd = new FormData(); fd.append("file", f);
                  const { data } = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
                  setForm({ ...form, image_url: data.url });
                }} />
              </label>
            </div>
            {form.image_url && <img src={form.image_url} alt="preview" className="mt-2 w-32 h-32 object-cover rounded border border-zinc-800" />}
          </div>
          <label className="flex items-center gap-2 text-white text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label>
          <label className="flex items-center gap-2 text-white text-sm"><input type="checkbox" checked={form.favorite || false} onChange={(e) => setForm({ ...form, favorite: e.target.checked })} /> Favorito</label>
          <label className="col-span-2 flex items-center gap-2 text-white text-sm"><input type="checkbox" checked={form.is_starting_price || false} onChange={(e) => setForm({ ...form, is_starting_price: e.target.checked })} /> Preço "A partir de" (pergunta valor final na venda)</label>
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-2"><label className="text-xs text-zinc-500 uppercase">Variações</label><button onClick={addVar} className="text-cyan-400 text-xs flex items-center gap-1"><Plus size={12} /> Adicionar</button></div>
            {form.variations?.map((v, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input value={v.name} onChange={(e) => updVar(i, "name", e.target.value)} placeholder="Nome" className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm" />
                <input type="number" step="0.01" value={v.price} onChange={(e) => updVar(i, "price", Number(e.target.value))} placeholder="Preço" className="w-24 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm" />
                <button onClick={() => delVar(i)} className="text-red-400"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onSave} data-testid="save-product" className="w-full mt-4 bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold py-2 rounded">Salvar</button>
      </div>
    </div>
  );
}

function ImportModal({ onClose }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const upload = async () => {
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try { const { data } = await api.post("/products/import/preview", fd, { headers: { "Content-Type": "multipart/form-data" } }); setPreview(data); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };
  const confirm = async () => {
    const { data } = await api.post("/products/import/confirm", { rows: preview.rows });
    toast.success(`Criados: ${data.created}, atualizados: ${data.updated}`); onClose();
  };
  const template = () => {
    const csv = "categoria,produto,variacao,preco,unidade,tipo_preco,ativo\nAdesivos,Adesivo 4x4,130 unid,25,Unidade,fixed,true\n";
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "modelo-produtos.csv"; a.click();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-riosul p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between mb-4"><h3 className="text-xl font-bold text-white">Importar produtos</h3><button onClick={onClose}><X /></button></div>
        <button onClick={template} className="text-cyan-400 text-sm mb-3">Baixar modelo CSV</button>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} data-testid="import-file" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm" />
        <button onClick={upload} className="mt-2 bg-cyan-500 text-white font-bold px-4 py-2 rounded text-sm">Pré-visualizar</button>
        {preview && (
          <>
            <div className="mt-4 text-sm text-white">Linhas: {preview.count} · Erros: {preview.errors.length}</div>
            <div className="mt-2 max-h-64 overflow-auto text-xs">
              <table className="w-full">
                <thead className="text-zinc-500"><tr><th className="text-left">Cat</th><th>Produto</th><th>Var</th><th>Preço</th></tr></thead>
                <tbody>{preview.rows.slice(0, 20).map((r, i) => (<tr key={i}><td className="text-zinc-400">{r.categoria}</td><td className="text-white">{r.produto}</td><td className="text-cyan-400">{r.variacao}</td><td className="text-yellow-400">{brl(r.preco)}</td></tr>))}</tbody>
              </table>
            </div>
            <button onClick={confirm} data-testid="import-confirm" className="mt-3 w-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold py-2 rounded">Confirmar importação</button>
          </>
        )}
      </div>
    </div>
  );
}
