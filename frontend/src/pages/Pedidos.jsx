import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { brl, fmtDate } from "@/lib/format";
import { Link } from "react-router-dom";
import { LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["PEDIDO RECEBIDO","AGUARDANDO ARTE","ARTE EM CRIAÇÃO","AGUARDANDO APROVAÇÃO","ARTE APROVADA","EM PRODUÇÃO","PRONTO","ENTREGUE"];

export default function Pedidos() {
  const [sales, setSales] = useState([]);
  const [view, setView] = useState("kanban");
  const load = () => api.get("/sales").then((r) => setSales(r.data.filter((s) => !s.cancelled)));
  useEffect(() => { load(); }, []);

  const move = async (id, status) => {
    await api.put(`/sales/${id}/status`, { status });
    toast.success("Movido"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Pedidos</h1>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button onClick={() => setView("kanban")} data-testid="view-kanban" className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${view === "kanban" ? "bg-cyan-500 text-white" : "text-zinc-400"}`}><LayoutGrid size={14} /> Kanban</button>
          <button onClick={() => setView("list")} data-testid="view-list" className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${view === "list" ? "bg-cyan-500 text-white" : "text-zinc-400"}`}><List size={14} /> Lista</button>
        </div>
      </div>
      {view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map((st) => {
            const items = sales.filter((s) => s.status === st);
            return (
              <div key={st} className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 min-w-[280px] space-y-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); move(e.dataTransfer.getData("id"), st); }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold text-white uppercase tracking-wider">{st}</div>
                  <div className="text-xs text-zinc-500 px-2 py-0.5 rounded bg-zinc-800">{items.length}</div>
                </div>
                {items.map((s) => (
                  <div key={s.id} draggable onDragStart={(e) => e.dataTransfer.setData("id", s.id)}
                    className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 cursor-grab space-y-1">
                    <div className="flex justify-between items-start">
                      <Link to={`/vendas/${s.id}`} className="text-cyan-400 font-mono text-xs font-bold">#{s.order_number}</Link>
                      <span className="text-yellow-400 font-mono text-sm">{brl(s.total)}</span>
                    </div>
                    <div className="text-sm text-white truncate">{s.customer_name || "Sem cliente"}</div>
                    {s.delivery_date && <div className="text-xs text-zinc-500">Prazo: {fmtDate(s.delivery_date)}</div>}
                    <div className="text-[10px] text-zinc-500">{s.items.length} item(ns) · {s.seller_name}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-riosul overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-500 uppercase"><tr><th className="text-left px-3 py-2">Pedido</th><th className="text-left">Cliente</th><th className="text-left">Prazo</th><th className="text-left">Status</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-t border-zinc-800/60">
                  <td className="px-3 py-2"><Link to={`/vendas/${s.id}`} className="text-cyan-400 font-mono">#{s.order_number}</Link></td>
                  <td className="text-white">{s.customer_name}</td>
                  <td className="text-zinc-400">{s.delivery_date ? fmtDate(s.delivery_date) : "-"}</td>
                  <td><span className="text-xs px-2 py-1 rounded bg-zinc-800 text-white">{s.status}</span></td>
                  <td className="text-right text-yellow-400 font-mono pr-3">{brl(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
