import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export default function Categorias() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ name: "", order: 0, active: true });
  const load = () => api.get("/categories").then(r => setList(r.data));
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!form.name) return;
    if (form.id) await api.put(`/categories/${form.id}`, form);
    else await api.post("/categories", form);
    setForm({ name: "", order: 0, active: true }); load(); toast.success("Salvo");
  };
  const del = async (id) => { await api.delete(`/categories/${id}`); load(); };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Categorias</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card-riosul p-4 space-y-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" data-testid="cat-name" />
          <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} placeholder="Ordem" className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" />
          <label className="flex items-center gap-2 text-white text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativa</label>
          <button onClick={save} data-testid="cat-save" className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold py-2 rounded"><Plus size={14} className="inline" /> Salvar</button>
        </div>
        <div className="md:col-span-2 card-riosul overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-500 uppercase"><tr><th className="text-left px-3 py-2">Nome</th><th>Ordem</th><th>Ativa</th><th></th></tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c.id} className="border-t border-zinc-800/60">
                <td className="px-3 py-2 text-white">{c.name}</td><td className="text-zinc-400">{c.order}</td>
                <td className={c.active ? "text-green-400" : "text-red-400"}>{c.active ? "Sim" : "Não"}</td>
                <td className="text-right pr-3"><button onClick={() => setForm(c)} className="text-cyan-400 mr-2"><Edit size={14} /></button><button onClick={() => del(c.id)} className="text-red-400"><Trash2 size={14} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
