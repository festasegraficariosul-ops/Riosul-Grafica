import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, Edit } from "lucide-react";
import { toast } from "sonner";

export default function Funcionarios() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "vendedor", active: true });
  const load = () => api.get("/users").then(r => setList(r.data));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      if (form.id) { const upd = { name: form.name, role: form.role, active: form.active }; if (form.password) upd.password = form.password; await api.put(`/users/${form.id}`, upd); }
      else await api.post("/users", form);
      setForm({ email: "", password: "", name: "", role: "vendedor", active: true }); load(); toast.success("Salvo");
    } catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Funcionários</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card-riosul p-4 space-y-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" data-testid="user-name" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" disabled={!!form.id} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" data-testid="user-email" />
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={form.id ? "Nova senha (opcional)" : "Senha"} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" data-testid="user-password" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm">
            <option value="admin">Administrador</option><option value="vendedor">Vendedor</option>
          </select>
          <label className="flex items-center gap-2 text-white text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label>
          <button onClick={save} data-testid="user-save" className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold py-2 rounded">Salvar</button>
        </div>
        <div className="md:col-span-2 card-riosul overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-500 uppercase"><tr><th className="text-left px-3 py-2">Nome</th><th>Email</th><th>Perfil</th><th></th></tr></thead>
            <tbody>{list.map((u) => (
              <tr key={u.id} className="border-t border-zinc-800/60"><td className="px-3 py-2 text-white">{u.name}</td><td className="text-zinc-400">{u.email}</td>
                <td><span className={`text-xs px-2 py-1 rounded ${u.role === "admin" ? "bg-pink-500/20 text-pink-300" : "bg-cyan-500/20 text-cyan-300"}`}>{u.role}</span></td>
                <td className="text-right pr-3"><button onClick={() => setForm({ ...u, password: "" })} className="text-cyan-400"><Edit size={14} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
