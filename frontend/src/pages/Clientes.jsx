import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { brl, fmtDate } from "@/lib/format";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export default function Clientes() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", instagram: "", notes: "" });
  const [detail, setDetail] = useState(null);

  const load = () => api.get("/customers", { params: q ? { q } : {} }).then(r => setList(r.data));
  useEffect(() => { load(); }, [q]);

  const save = async () => {
    if (!form.name) return toast.error("Nome obrigatório");
    if (form.id) await api.put(`/customers/${form.id}`, form);
    else await api.post("/customers", form);
    setForm({ name: "", phone: "", instagram: "", notes: "" });
    load(); toast.success("Salvo");
  };

  const openDetail = async (c) => {
    const { data } = await api.get(`/customers/${c.id}`); setDetail(data);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Clientes</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card-riosul p-4 space-y-2">
          <div className="text-sm font-semibold text-white">Novo/editar cliente</div>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" data-testid="customer-name" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefone/WhatsApp" className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" data-testid="customer-phone" />
          <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="Instagram" className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" />
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações" rows={2} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" />
          <button onClick={save} data-testid="save-customer" className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold py-2 rounded"><Plus size={14} className="inline" /> Salvar</button>
        </div>
        <div className="md:col-span-2 card-riosul p-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente..." className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm mb-3" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-zinc-500 uppercase"><tr><th className="text-left py-2">Nome</th><th className="text-left">Telefone</th><th></th></tr></thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-t border-zinc-800/60 hover:bg-zinc-900/40">
                    <td className="py-2 text-white">{c.name}</td>
                    <td className="text-zinc-400">{c.phone}</td>
                    <td className="text-right pr-2">
                      <button onClick={() => setForm(c)} className="text-cyan-400 mr-2"><Edit size={14} /></button>
                      <button onClick={() => openDetail(c)} className="text-yellow-400 text-xs">Histórico</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="card-riosul p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-2">{detail.customer.name}</h2>
            <div className="text-sm text-zinc-400 mb-4">{detail.customer.phone}</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-3 rounded bg-zinc-900"><div className="text-xs text-zinc-500">Pedidos</div><div className="text-xl text-white font-mono">{detail.orders_count}</div></div>
              <div className="p-3 rounded bg-zinc-900"><div className="text-xs text-zinc-500">Total gasto</div><div className="text-xl text-cyan-400 font-mono">{brl(detail.total_spent)}</div></div>
              <div className="p-3 rounded bg-zinc-900"><div className="text-xs text-zinc-500">Pendente</div><div className="text-xl text-red-400 font-mono">{brl(detail.pending)}</div></div>
            </div>
            <div className="space-y-2">
              {detail.sales.map((s) => (
                <div key={s.id} className="p-3 rounded bg-zinc-900 border border-zinc-800 flex justify-between text-sm">
                  <div><div className="text-white">#{s.order_number} — {fmtDate(s.created_at)}</div>
                    <div className="text-xs text-zinc-500">{s.status}</div></div>
                  <div className="text-right"><div className="text-yellow-400 font-mono">{brl(s.total)}</div>
                    {s.balance > 0 && <div className="text-xs text-red-400">Saldo {brl(s.balance)}</div>}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
