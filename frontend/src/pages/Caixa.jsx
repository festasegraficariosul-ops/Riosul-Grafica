import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { brl } from "@/lib/format";

export default function Caixa() {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [users, setUsers] = useState([]);
  const [sellerId, setSellerId] = useState("");
  const [data, setData] = useState(null);
  const load = () => { const params = { date }; if (sellerId) params.seller_id = sellerId; api.get("/cash/closure", { params }).then(r => setData(r.data)); };
  useEffect(() => { api.get("/users").then(r => setUsers(r.data)); }, []);
  useEffect(() => { load(); }, [date, sellerId]);
  if (!data) return <div className="text-zinc-500">Carregando...</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Fechamento de Caixa</h1>
      <div className="card-riosul p-4 flex gap-3 items-end flex-wrap">
        <div><label className="text-xs text-zinc-500">Data</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" /></div>
        <div><label className="text-xs text-zinc-500">Vendedor</label>
          <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm"><option value="">Todos</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-riosul p-4"><div className="text-xs text-zinc-500 uppercase">Total vendido</div><div className="kpi-number text-2xl text-yellow-400">{brl(data.total_sold)}</div></div>
        <div className="card-riosul p-4"><div className="text-xs text-zinc-500 uppercase">Recebido</div><div className="kpi-number text-2xl text-green-400">{brl(data.total_received)}</div></div>
        <div className="card-riosul p-4"><div className="text-xs text-zinc-500 uppercase">A receber</div><div className="kpi-number text-2xl text-red-400">{brl(data.total_pending)}</div></div>
        <div className="card-riosul p-4"><div className="text-xs text-zinc-500 uppercase">Vendas</div><div className="kpi-number text-2xl text-cyan-400">{data.count}</div></div>
      </div>
      <div className="card-riosul p-4">
        <div className="text-sm font-semibold text-white mb-3">Recebido por forma de pagamento</div>
        <table className="w-full text-sm"><thead className="text-xs text-zinc-500 uppercase"><tr><th className="text-left py-2">Forma</th><th className="text-right">Valor</th></tr></thead>
          <tbody>{data.by_method.map((m, i) => (<tr key={i} className="border-t border-zinc-800/60"><td className="py-2 text-white">{m.method}</td><td className="text-right text-yellow-400 font-mono">{brl(m.total)}</td></tr>))}</tbody></table>
      </div>
    </div>
  );
}
