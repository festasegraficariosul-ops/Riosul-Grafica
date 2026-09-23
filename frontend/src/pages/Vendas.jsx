import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { brl, fmtDate } from "@/lib/format";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Search, Eye, Copy, X, DollarSign, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export function Vendas() {
  const [sales, setSales] = useState([]);
  const [q, setQ] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const load = () => {
    const params = {};
    if (q) params.q = q;
    if (start) params.start = start;
    if (end) params.end = end;
    api.get("/sales", { params }).then((r) => setSales(r.data));
  };
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Vendas</h1>
      <div className="card-riosul p-4 flex flex-wrap gap-2 items-end">
        <div><label className="text-xs text-zinc-500">Buscar</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente ou telefone" className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" /></div>
        <div><label className="text-xs text-zinc-500">De</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" /></div>
        <div><label className="text-xs text-zinc-500">Até</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm" /></div>
        <button onClick={load} className="bg-cyan-500 text-white px-4 py-2 rounded text-sm font-bold">Filtrar</button>
      </div>
      <div className="card-riosul overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/60">
            <tr>
              <th className="text-left px-3 py-2">#</th><th className="text-left">Data</th><th className="text-left">Vendedor</th>
              <th className="text-left">Cliente</th><th className="text-left">Canal</th><th className="text-right">Total</th>
              <th className="text-right">Saldo</th><th className="text-left">Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-t border-zinc-800/60 hover:bg-zinc-900/40">
                <td className="px-3 py-2 text-cyan-400 font-mono">#{s.order_number}</td>
                <td className="text-zinc-300">{fmtDate(s.created_at)}</td>
                <td className="text-zinc-300">{s.seller_name}</td>
                <td className="text-white">{s.customer_name || "-"}</td>
                <td className="text-zinc-400">{s.channel}</td>
                <td className="text-right text-yellow-400 font-mono">{brl(s.total)}</td>
                <td className="text-right text-red-400 font-mono">{brl(s.balance)}</td>
                <td><span className="text-xs px-2 py-1 rounded bg-zinc-800 text-white">{s.status}</span></td>
                <td className="pr-3"><Link to={`/vendas/${s.id}`} className="text-cyan-400"><Eye size={14} /></Link></td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan="9" className="text-center py-10 text-zinc-500">Nenhuma venda</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function VendaDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [sale, setSale] = useState(null);
  const [methods, setMethods] = useState([]);
  const [pay, setPay] = useState({ method: "PIX", amount: 0 });
  const load = () => api.get(`/sales/${id}`).then((r) => setSale(r.data));
  useEffect(() => { load(); api.get("/payment_methods").then(r => setMethods(r.data)); }, [id]);
  if (!sale) return <div className="text-zinc-500">Carregando...</div>;

  const changeStatus = async (s) => { await api.put(`/sales/${id}/status`, { status: s }); toast.success("Status atualizado"); load(); };
  const addPayment = async () => { if (!pay.amount) return; await api.post(`/sales/${id}/payment`, pay); toast.success("Pagamento registrado"); load(); };
  const cancelSale = async () => { if (!confirm("Cancelar venda?")) return; await api.delete(`/sales/${id}`); toast.success("Cancelada"); load(); };

  const copyReceipt = () => {
    const lines = [`*RIO SUL FESTAS & GRÁFICA*`, `Pedido #${sale.order_number}`, `Cliente: ${sale.customer_name || "-"}`,
      `Data: ${fmtDate(sale.created_at)}`, ``, `*Produtos:*`];
    sale.items.forEach((it) => lines.push(`• ${it.quantity}× ${it.product_name}${it.variation_name ? " - " + it.variation_name : ""} — ${brl(it.subtotal)}`));
    lines.push(``, `Total: ${brl(sale.total)}`, `Pago: ${brl(sale.paid)}`, `Saldo: ${brl(sale.balance)}`);
    if (sale.delivery_date) lines.push(`Prazo: ${fmtDate(sale.delivery_date)}`);
    if (sale.notes) lines.push(`Obs: ${sale.notes}`);
    navigator.clipboard.writeText(lines.join("\n")); toast.success("Copiado para WhatsApp");
  };

  const STATUSES = ["PEDIDO RECEBIDO","AGUARDANDO ARTE","ARTE EM CRIAÇÃO","AGUARDANDO APROVAÇÃO","ARTE APROVADA","EM PRODUÇÃO","PRONTO","ENTREGUE"];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Pedido #{sale.order_number}</h1>
        <div className="flex gap-2">
          <button onClick={copyReceipt} className="bg-green-500/90 text-white px-3 py-2 rounded text-sm font-bold flex items-center gap-1"><Copy size={14} /> WhatsApp</button>
          {user?.role === "admin" && !sale.cancelled && <button onClick={cancelSale} className="bg-red-500/90 text-white px-3 py-2 rounded text-sm flex items-center gap-1"><X size={14} /> Cancelar</button>}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-riosul p-4 text-sm space-y-1">
          <div className="text-zinc-500 text-xs uppercase mb-2">Dados</div>
          <div><span className="text-zinc-500">Vendedor:</span> <span className="text-white">{sale.seller_name}</span></div>
          <div><span className="text-zinc-500">Data:</span> <span className="text-white">{fmtDate(sale.created_at)}</span></div>
          <div><span className="text-zinc-500">Cliente:</span> <span className="text-white">{sale.customer_name}</span></div>
          <div><span className="text-zinc-500">Telefone:</span> <span className="text-white">{sale.customer_phone}</span></div>
          <div><span className="text-zinc-500">Canal:</span> <span className="text-white">{sale.channel}</span></div>
          <div><span className="text-zinc-500">Prazo:</span> <span className="text-white">{sale.delivery_date ? fmtDate(sale.delivery_date) : "-"}</span></div>
          <div className="pt-2">
            <label className="text-zinc-500 text-xs">Status</label>
            <select data-testid="sale-status" value={sale.status} onChange={(e) => changeStatus(e.target.value)} className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm">
              {STATUSES.map(s => <option key={s}>{s}</option>)}
              <option>CANCELADO</option>
            </select>
          </div>
        </div>
        <div className="card-riosul p-4 text-sm">
          <div className="text-zinc-500 text-xs uppercase mb-2">Financeiro</div>
          <div className="flex justify-between"><span className="text-zinc-400">Total:</span><span className="text-yellow-400 font-mono font-bold">{brl(sale.total)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Pago:</span><span className="text-green-400 font-mono">{brl(sale.paid)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Saldo:</span><span className="text-red-400 font-mono font-bold">{brl(sale.balance)}</span></div>
          {sale.balance > 0 && (
            <div className="mt-3 flex gap-2">
              <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-xs">
                {methods.map(m => <option key={m.id}>{m.name}</option>)}
              </select>
              <input type="number" step="0.01" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })} placeholder="Valor" className="w-24 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-xs" />
              <button onClick={addPayment} data-testid="add-payment" className="bg-cyan-500 text-white px-3 rounded text-xs font-bold">Pagar</button>
            </div>
          )}
        </div>
      </div>
      <div className="card-riosul overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-zinc-500 uppercase"><tr><th className="text-left px-3 py-2">Produto</th><th>Qtd</th><th className="text-right">Unit</th><th className="text-right">Subtotal</th></tr></thead>
          <tbody>
            {sale.items.map((it, i) => (
              <tr key={i} className="border-t border-zinc-800/60">
                <td className="px-3 py-2 text-white">{it.product_name} {it.variation_name && <span className="text-cyan-400 text-xs">— {it.variation_name}</span>}</td>
                <td className="text-center text-zinc-300">{it.quantity}</td>
                <td className="text-right text-zinc-300 font-mono">{brl(it.unit_price)}</td>
                <td className="text-right text-yellow-400 font-mono pr-3">{brl(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
