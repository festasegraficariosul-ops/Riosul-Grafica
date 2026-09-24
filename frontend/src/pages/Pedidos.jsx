import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { brl, fmtDate } from "@/lib/format";
import { Link } from "react-router-dom";
import { LayoutGrid, List, CalendarDays, UserRound, Package, AlertTriangle, Image as ImageIcon, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["PEDIDO RECEBIDO","AGUARDANDO ARTE","ARTE EM CRIAÇÃO","AGUARDANDO APROVAÇÃO","ARTE APROVADA","EM PRODUÇÃO","PRONTO","ENTREGUE"];

const STATUS_ACCENTS = {
  "PEDIDO RECEBIDO": "border-cyan-400/60 bg-cyan-400",
  "AGUARDANDO ARTE": "border-yellow-400/60 bg-yellow-400",
  "ARTE EM CRIAÇÃO": "border-fuchsia-400/60 bg-fuchsia-400",
  "AGUARDANDO APROVAÇÃO": "border-orange-400/60 bg-orange-400",
  "ARTE APROVADA": "border-violet-400/60 bg-violet-400",
  "EM PRODUÇÃO": "border-pink-400/60 bg-pink-400",
  "PRONTO": "border-emerald-400/60 bg-emerald-400",
  "ENTREGUE": "border-zinc-500/60 bg-zinc-400",
};

function referenceImage(sale) {
  return sale.attachments?.[0] || sale.items?.find((item) => item.image_url)?.image_url || "";
}

function productSummary(sale) {
  const items = sale.items || [];
  if (!items.length) return "Sem produto informado";
  const first = items[0].product_name || "Produto/serviço";
  return items.length > 1 ? `${first} +${items.length - 1} item(ns)` : first;
}

function isOverdue(sale) {
  if (!sale.delivery_date || sale.status === "ENTREGUE") return false;
  const deadline = new Date(`${sale.delivery_date}T23:59:59`);
  return !Number.isNaN(deadline.getTime()) && deadline < new Date();
}

function isUrgent(sale) {
  return Boolean(sale.urgent || sale.is_urgent || sale.priority === "urgent" || sale.priority === "URGENTE");
}

function deadlineLabel(sale) {
  if (!sale.delivery_date) return "Sem prazo";
  return fmtDate(sale.delivery_date);
}

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
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Pedidos</h1>
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-zinc-400">{sales.length} total</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Acompanhe cada pedido por etapa de produção</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          <button onClick={() => setView("kanban")} data-testid="view-kanban" className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold ${view === "kanban" ? "bg-cyan-500 text-white" : "text-zinc-400 hover:text-white"}`}><LayoutGrid size={14} /> Kanban</button>
          <button onClick={() => setView("list")} data-testid="view-list" className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold ${view === "list" ? "bg-cyan-500 text-white" : "text-zinc-400 hover:text-white"}`}><List size={14} /> Lista</button>
        </div>
      </div>
      {view === "kanban" ? (
        <div className="w-full overflow-x-auto pb-3">
          <div className="flex min-w-max gap-3">
            {STATUSES.map((st) => {
              const items = sales.filter((s) => s.status === st);
              const accent = STATUS_ACCENTS[st] || "border-zinc-700 bg-zinc-500";
              return (
                <section key={st} className={`flex h-[calc(100vh-11.5rem)] min-h-[420px] w-[clamp(250px,22vw,320px)] min-w-[250px] max-w-[320px] flex-col overflow-hidden rounded-xl border bg-zinc-950/80 ${accent.split(" ")[0]}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); move(e.dataTransfer.getData("id"), st); }}>
                  <header className="shrink-0 border-b border-zinc-800/80 bg-zinc-900/80 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${accent.split(" ")[1]}`} />
                        <h2 className="truncate text-[11px] font-extrabold uppercase tracking-wide text-zinc-200">{st}</h2>
                      </div>
                      <span className="shrink-0 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs font-bold text-zinc-300">{items.length}</span>
                    </div>
                  </header>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                    {items.length === 0 && <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-center text-[11px] text-zinc-600">Nenhum pedido</div>}
                    {items.map((s) => {
                      const image = referenceImage(s);
                      const overdue = isOverdue(s);
                      const urgent = isUrgent(s);
                      return (
                        <Link key={s.id} to={`/vendas/${s.id}`} draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("id", s.id); }}
                          className={`group block cursor-grab overflow-hidden rounded-lg border bg-zinc-900/95 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:bg-zinc-900 active:cursor-grabbing ${overdue ? "border-red-500/70 shadow-red-950/30" : urgent ? "border-amber-400/70 shadow-amber-950/20" : "border-zinc-800"}`}>
                          {image && <div className="relative h-20 w-full overflow-hidden border-b border-zinc-800 bg-zinc-950"><img src={image} alt="Referência do pedido" className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" /><span className="absolute right-1.5 top-1.5 rounded bg-black/70 p-1 text-zinc-200"><ImageIcon size={12} /></span></div>}
                          <div className="space-y-2 p-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-mono text-sm font-extrabold text-cyan-300">#{s.order_number}</span>
                              <span className="font-mono text-xs font-bold text-yellow-400">{brl(s.total)}</span>
                            </div>
                            <div className="truncate text-sm font-bold text-white">{s.customer_name || "Sem cliente"}</div>
                            <div className="flex items-start gap-1.5 text-xs text-zinc-300"><Package size={13} className="mt-0.5 shrink-0 text-cyan-400" /><span className="truncate">{productSummary(s)}</span></div>
                            <div className="flex items-center justify-between gap-2 border-t border-zinc-800/80 pt-2 text-[10px]">
                              <span className={`flex min-w-0 items-center gap-1 truncate ${overdue ? "font-bold text-red-300" : urgent ? "font-bold text-amber-300" : "text-zinc-400"}`}>
                                {overdue || urgent ? <AlertTriangle size={12} className="shrink-0" /> : <CalendarDays size={12} className="shrink-0 text-zinc-500" />}
                                {overdue ? "Atrasado · " : urgent ? "Urgente · " : "Prazo · "}{deadlineLabel(s)}
                              </span>
                              <span className="flex max-w-[42%] items-center gap-1 truncate text-zinc-500" title={s.seller_name || "Sem vendedor"}><UserRound size={11} className="shrink-0" />{s.seller_name || "Sem vendedor"}</span>
                            </div>
                            <div className="flex items-center justify-end text-[10px] font-semibold text-zinc-600 opacity-0 transition group-hover:opacity-100">Abrir detalhes <ArrowRight size={11} className="ml-1" /></div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
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
