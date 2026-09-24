import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { brl, fmtDate } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";


export default function Vales() {
  const [users, setUsers] = useState([]);
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ user_id: "", amount: 0, date: new Date().toISOString().slice(0,10), notes: "" });

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const load = () => api.get("/vales").then(r => setList(r.data));
  useEffect(() => {
    if (user?.role === "admin") {
      api.get("/users").then(r => { setUsers(r.data); setForm(f => ({ ...f, user_id: r.data[0]?.id || "" })); });
    } else if (user) {
      setUsers([user]); setForm(f => ({ ...f, user_id: user.id }));
    }
    load();
  }, [user]);
  const save = async () => {
    if (!form.user_id || !form.amount) return toast.error("Preencha os campos");
    await api.post("/vales", form); load(); toast.success("Vale registrado");
    setForm({ ...form, amount: 0, notes: "" });
  };
  const del = async (id) => { await api.delete(`/vales/${id}`); load(); };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Vales dos Funcionários</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card-riosul p-4 space-y-2">
          <select value={form.user_id} onChange={(e) => setForm({...form, user_id: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm">
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({...form, amount: Number(e.target.value)})} placeholder="Valor" className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" data-testid="vale-amount" />
          <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" />
          <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="Observação" rows={2} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" />
          <button onClick={save} data-testid="vale-save" className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold py-2 rounded">Registrar</button>
        </div>
        <div className="md:col-span-2 card-riosul overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-500 uppercase"><tr><th className="text-left px-3 py-2">Data</th><th>Funcionário</th><th className="text-right">Valor</th><th>Obs</th><th></th></tr></thead>
            <tbody>{list.map(v => (
              <tr key={v.id} className="border-t border-zinc-800/60"><td className="px-3 py-2 text-zinc-300">{fmtDate(v.date)}</td>
                <td className="text-white">{v.user_name}</td><td className="text-right text-yellow-400 font-mono">{brl(v.amount)}</td>
                <td className="text-xs text-zinc-500">{v.notes}</td>
                <td className="pr-3 text-right">{isAdmin && <button onClick={() => del(v.id)} className="text-red-400"><Trash2 size={14} /></button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
