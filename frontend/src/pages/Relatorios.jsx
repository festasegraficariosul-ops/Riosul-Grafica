import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { brl } from "@/lib/format";

export default function Relatorios() {
  const [groupBy, setGroupBy] = useState("day");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rows, setRows] = useState([]);
  const [top, setTop] = useState([]);
  const load = () => { const p = { group_by: groupBy }; if (start) p.start = start; if (end) p.end = end;
    api.get("/reports/sales", { params: p }).then(r => setRows(r.data));
    api.get("/reports/top-products").then(r => setTop(r.data)); };
  useEffect(() => { load(); }, [groupBy]);
  const exportCSV = () => {
    const csv = ["chave,vendas,total,pago,saldo", ...rows.map(r => `${r.key},${r.count},${r.total},${r.paid},${r.balance}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `relatorio_${groupBy}.csv`; a.click();
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Relatórios</h1>
      <div className="card-riosul p-4 flex gap-3 items-end flex-wrap">
        <div><label className="text-xs text-zinc-500">Agrupar por</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm">
            <option value="day">Dia</option><option value="month">Mês</option><option value="seller">Vendedor</option><option value="channel">Canal</option>
          </select></div>
        <div><label className="text-xs text-zinc-500">De</label><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" /></div>
        <div><label className="text-xs text-zinc-500">Até</label><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" /></div>
        <button onClick={load} className="bg-cyan-500 text-white px-4 py-2 rounded text-sm font-bold">Aplicar</button>
        <button onClick={exportCSV} className="bg-zinc-800 text-white px-4 py-2 rounded text-sm">Exportar CSV</button>
      </div>
      <div className="card-riosul overflow-x-auto">
        <table className="w-full text-sm"><thead className="text-xs text-zinc-500 uppercase"><tr><th className="text-left px-3 py-2">Chave</th><th className="text-right">Vendas</th><th className="text-right">Total</th><th className="text-right">Pago</th><th className="text-right">Saldo</th></tr></thead>
          <tbody>{rows.map((r, i) => (<tr key={i} className="border-t border-zinc-800/60"><td className="px-3 py-2 text-white">{r.key}</td><td className="text-right text-zinc-300">{r.count}</td><td className="text-right text-yellow-400 font-mono">{brl(r.total)}</td><td className="text-right text-green-400 font-mono">{brl(r.paid)}</td><td className="text-right text-red-400 font-mono pr-3">{brl(r.balance)}</td></tr>))}</tbody></table>
      </div>
      <div className="card-riosul p-4">
        <div className="text-sm font-semibold text-white mb-3">Top 20 produtos mais vendidos</div>
        <table className="w-full text-sm"><thead className="text-xs text-zinc-500 uppercase"><tr><th className="text-left py-2">Produto</th><th className="text-right">Qtd</th><th className="text-right">Total</th></tr></thead>
          <tbody>{top.slice(0,20).map((t, i) => (<tr key={i} className="border-t border-zinc-800/60"><td className="py-2 text-white">{t.name}</td><td className="text-right text-zinc-300">{t.count}</td><td className="text-right text-yellow-400 font-mono">{brl(t.total)}</td></tr>))}</tbody></table>
      </div>
    </div>
  );
}
