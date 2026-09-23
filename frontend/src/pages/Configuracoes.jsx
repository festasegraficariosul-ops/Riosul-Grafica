import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

function LookupList({ title, endpoint }) {
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const load = () => api.get(`/${endpoint}`).then(r => setList(r.data));
  useEffect(() => { load(); }, []);
  const add = async () => { if (!name) return; await api.post(`/${endpoint}`, { name, active: true }); setName(""); load(); };
  const del = async (id) => { await api.delete(`/${endpoint}/${id}`); load(); };
  return (
    <div className="card-riosul p-4">
      <div className="text-sm font-semibold text-white mb-2">{title}</div>
      <div className="flex gap-2 mb-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Adicionar..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" />
        <button onClick={add} className="bg-cyan-500 text-white px-3 rounded text-sm font-bold"><Plus size={14} /></button>
      </div>
      <div className="space-y-1">
        {list.filter(x => x.active).map(x => (
          <div key={x.id} className="flex justify-between items-center p-2 rounded bg-zinc-950 border border-zinc-800">
            <span className="text-sm text-white">{x.name}</span>
            <button onClick={() => del(x.id)} className="text-red-400"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Configuracoes() {
  const [s, setS] = useState({ company_name: "", phone: "", whatsapp: "", instagram: "", address: "", receipt_footer: "" });
  useEffect(() => { api.get("/settings").then(r => setS(r.data)); }, []);
  const save = async () => { await api.put("/settings", s); toast.success("Salvo"); };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Configurações</h1>
      <div className="card-riosul p-4 space-y-2 max-w-xl">
        <div className="text-sm font-semibold text-white mb-2">Dados da empresa</div>
        {["company_name","phone","whatsapp","instagram","address","receipt_footer"].map((k) => (
          <div key={k}><label className="text-xs text-zinc-500 uppercase">{k.replace("_"," ")}</label>
            <input value={s[k] || ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" /></div>
        ))}
        <button onClick={save} className="bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold px-4 py-2 rounded text-sm">Salvar</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <LookupList title="Canais de venda" endpoint="channels" />
        <LookupList title="Formas de pagamento" endpoint="payment_methods" />
        <LookupList title="Unidades" endpoint="units" />
      </div>
    </div>
  );
}
