import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { brl, fmtDate } from "@/lib/format";
import { Link } from "react-router-dom";
import { LayoutGrid, List, CalendarDays, UserRound, Package, AlertTriangle, Image as ImageIcon, ArrowRight, Search, SlidersHorizontal, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const KANBAN_COLUMNS = [
  { key: "PEDIDO RECEBIDO", label: "PEDIDO RECEBIDO", statuses: ["PEDIDO RECEBIDO"], dropStatus: "PEDIDO RECEBIDO", accent: "border-cyan-400/60 bg-cyan-400" },
  { key: "ARTE EM CRIAÇÃO", label: "ARTE EM CRIAÇÃO / AGUARDANDO ARTE", statuses: ["ARTE EM CRIAÇÃO", "AGUARDANDO ARTE"], dropStatus: "ARTE EM CRIAÇÃO", accent: "border-fuchsia-400/60 bg-fuchsia-400" },
  { key: "AGUARDANDO APROVAÇÃO", label: "AGUARDANDO APROVAÇÃO", statuses: ["AGUARDANDO APROVAÇÃO"], dropStatus: "AGUARDANDO APROVAÇÃO", accent: "border-orange-400/60 bg-orange-400" },
  { key: "EM PRODUÇÃO", label: "EM PRODUÇÃO / ARTE APROVADA", statuses: ["EM PRODUÇÃO", "ARTE APROVADA"], dropStatus: "EM PRODUÇÃO", accent: "border-pink-400/60 bg-pink-400" },
  { key: "PRONTO", label: "PRONTO", statuses: ["PRONTO"], dropStatus: "PRONTO", accent: "border-emerald-400/60 bg-emerald-400" },
  { key: "EM ATRASO", label: "EM ATRASO", statuses: [], derived: "overdue", accent: "border-red-400/70 bg-red-400" },
  { key: "ENTREGUE", label: "ENTREGUE HOJE", statuses: ["ENTREGUE"], dropStatus: "ENTREGUE", accent: "border-zinc-500/60 bg-zinc-400" },
];

const FILTER_STATUSES = ["PEDIDO RECEBIDO", "AGUARDANDO ARTE", "ARTE EM CRIAÇÃO", "AGUARDANDO APROVAÇÃO", "ARTE APROVADA", "EM PRODUÇÃO", "PRONTO", "ENTREGUE"];

function normalize(value) {
  return String(value || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function deliveryDateKey(sale) {
  return sale.delivery_date ? String(sale.delivery_date).slice(0, 10) : "";
}


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
  const raw = String(sale.delivery_date);
  const deadline = new Date(raw.length > 10 ? raw : `${raw.slice(0, 10)}T23:59:59`);
  return !Number.isNaN(deadline.getTime()) && deadline < new Date();
}

function isDeliveredToday(sale) {
  return sale.status === "ENTREGUE" && Boolean(sale.delivered_at) && localDateKey(sale.delivered_at) === localDateKey();
}

function isAwaitingCustomer(sale) {
  return sale.status === "AGUARDANDO APROVAÇÃO";
}

function searchableText(sale) {
  const itemText = (sale.items || []).flatMap((item) => [item.product_name, item.variation_name]).join(" ");
  return normalize([sale.order_number, sale.customer_name, sale.customer_phone, itemText, sale.notes].join(" "));
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
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [filters, setFilters] = useState({ seller: "", status: "", deadline: "" });
  const load = () => api.get("/sales").then((r) => setSales(r.data.filter((s) => !s.cancelled)));
  useEffect(() => { load(); }, []);

  const move = async (id, status) => {
    await api.put(`/sales/${id}/status`, { status });
    toast.success("Movido"); load();
  };

  const sellers = Array.from(new Map(sales.filter((sale) => sale.seller_id || sale.seller_name).map((sale) => [sale.seller_id || sale.seller_name, { id: sale.seller_id || sale.seller_name, name: sale.seller_name || "Sem vendedor" }])).values());
  const today = localDateKey();
  const visibleSales = sales.filter((sale) => sale.status !== "ENTREGUE" || isDeliveredToday(sale));
  const filteredSales = visibleSales.filter((sale) => {
    const matchesQuery = !query.trim() || searchableText(sale).includes(normalize(query));
    const matchesQuick = !quickFilter
      || (quickFilter === "today" && deliveryDateKey(sale) === today)
      || (quickFilter === "overdue" && isOverdue(sale))
      || (quickFilter === "customer" && isAwaitingCustomer(sale));
    const matchesSeller = !filters.seller || sale.seller_id === filters.seller || sale.seller_name === filters.seller;
    const matchesStatus = !filters.status || sale.status === filters.status;
    const matchesDeadline = !filters.deadline
      || (filters.deadline === "today" && deliveryDateKey(sale) === today)
      || (filters.deadline === "overdue" && isOverdue(sale))
      || (filters.deadline === "with" && Boolean(sale.delivery_date))
      || (filters.deadline === "without" && !sale.delivery_date);
    return matchesQuery && matchesQuick && matchesSeller && matchesStatus && matchesDeadline;
  });

  const resetFilters = () => { setQuery(""); setQuickFilter(""); setFilters({ seller: "", status: "", deadline: "" }); };
  const activeFilterCount = [quickFilter, filters.seller, filters.status, filters.deadline].filter(Boolean).length;

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-white">Pedidos</h1><span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-zinc-400">{filteredSales.length} visíveis</span></div>
          <p className="mt-1 text-xs text-zinc-500">Acompanhe cada pedido por etapa de produção</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          <button onClick={() => setView("kanban")} data-testid="view-kanban" className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold ${view === "kanban" ? "bg-cyan-500 text-white" : "text-zinc-400 hover:text-white"}`}><LayoutGrid size={14} /> Kanban</button>
          <button onClick={() => setView("list")} data-testid="view-list" className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold ${view === "list" ? "bg-cyan-500 text-white" : "text-zinc-400 hover:text-white"}`}><List size={14} /> Lista</button>
        </div>
      </div>
      <div className="space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input data-testid="pedidos-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pedido, cliente, telefone ou produto..." className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-500/70" /></div>
          <button data-testid="filter-today" onClick={() => setQuickFilter(quickFilter === "today" ? "" : "today")} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${quickFilter === "today" ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-200" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"}`}>Hoje</button>
          <button data-testid="filter-overdue" onClick={() => setQuickFilter(quickFilter === "overdue" ? "" : "overdue")} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${quickFilter === "overdue" ? "border-red-400/60 bg-red-500/15 text-red-200" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"}`}>Atrasados</button>
          <button data-testid="filter-customer" onClick={() => setQuickFilter(quickFilter === "customer" ? "" : "customer")} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${quickFilter === "customer" ? "border-amber-400/60 bg-amber-500/15 text-amber-200" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"}`}>Aguardando cliente</button>
          <button data-testid="more-filters" onClick={() => setMoreOpen(!moreOpen)} className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold transition ${moreOpen || activeFilterCount > 0 ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"}`}><SlidersHorizontal size={14} /> Mais filtros {activeFilterCount > 0 && <span className="rounded-full bg-fuchsia-400 px-1.5 text-[10px] text-zinc-950">{activeFilterCount}</span>}</button>
          {(query || activeFilterCount > 0) && <button data-testid="clear-filters" onClick={resetFilters} className="flex items-center gap-1 px-2 py-2 text-xs font-semibold text-zinc-500 hover:text-white"><RotateCcw size={13} /> Limpar</button>}
        </div>
        {moreOpen && <div className="grid gap-2 border-t border-zinc-800/80 pt-2 sm:grid-cols-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Vendedor<select data-testid="filter-seller" value={filters.seller} onChange={(e) => setFilters({ ...filters, seller: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs font-normal text-white"><option value="">Todos</option>{sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}</select></label>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status real<select data-testid="filter-status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs font-normal text-white"><option value="">Todos</option>{FILTER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Prazo<select data-testid="filter-deadline" value={filters.deadline} onChange={(e) => setFilters({ ...filters, deadline: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs font-normal text-white"><option value="">Qualquer prazo</option><option value="today">Entrega hoje</option><option value="overdue">Atrasados</option><option value="with">Com prazo</option><option value="without">Sem prazo</option></select></label>
        </div>}
      </div>
      {view === "kanban" ? (
        <div className="w-full overflow-x-auto pb-3">
          <div className="flex min-w-max gap-3">
            {KANBAN_COLUMNS.map((col) => {
              const items = col.derived === "overdue"
                ? filteredSales.filter((s) => s.status !== "ENTREGUE" && isOverdue(s))
                : filteredSales.filter((s) => col.statuses.includes(s.status));
              const [borderClass, dotClass] = col.accent.split(" ");
              const isDroppable = Boolean(col.dropStatus);
              return (
                <section key={col.key} data-testid={`kanban-column-${col.key}`} className={`flex h-[calc(100vh-13.5rem)] min-h-[420px] w-[clamp(250px,22vw,320px)] min-w-[250px] max-w-[320px] flex-col overflow-hidden rounded-xl border bg-zinc-950/80 ${borderClass} ${!isDroppable ? "border-dashed" : ""}`}
                  onDragOver={(e) => { if (isDroppable) e.preventDefault(); }}
                  onDrop={(e) => { if (!isDroppable) return; e.preventDefault(); move(e.dataTransfer.getData("id"), col.dropStatus); }}>
                  <header className="shrink-0 border-b border-zinc-800/80 bg-zinc-900/80 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
                        <h2 className="truncate text-[11px] font-extrabold uppercase tracking-wide text-zinc-200">{col.label}</h2>
                      </div>
                      <span className="shrink-0 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs font-bold text-zinc-300">{items.length}</span>
                    </div>
                    {!isDroppable && <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Visão automática · não arraste aqui</p>}
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
              {filteredSales.map((s) => (
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
