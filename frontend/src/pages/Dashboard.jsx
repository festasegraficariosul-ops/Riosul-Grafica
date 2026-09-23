import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { brl } from "@/lib/format";
import { Link } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { ShoppingCart, DollarSign, Package, Clock, AlertTriangle, TrendingUp, Users, Table2, ShoppingBag, Calculator, Plus } from "lucide-react";

const Kpi = ({ label, value, icon: Icon, accent = "cyan" }) => {
  const map = { cyan: "text-cyan-400 border-cyan-500/30", pink: "text-pink-400 border-pink-500/30",
    yellow: "text-yellow-400 border-yellow-500/30", green: "text-green-400 border-green-500/30",
    red: "text-red-400 border-red-500/30" };
  return (
    <div className={`card-riosul p-5 border-l-4 ${map[accent]}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">{label}</div>
        <Icon size={16} className={map[accent].split(" ")[0]} />
      </div>
      <div className="mt-2 kpi-number text-2xl text-white">{value}</div>
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/dashboard").then(({ data }) => setData(data)); }, []);
  if (!data) return <div className="text-zinc-500">Carregando...</div>;

  const shortcuts = [
    { to: "/nova-venda", label: "Nova Venda", icon: Plus },
    { to: "/clientes", label: "Clientes", icon: Users },
    { to: "/pedidos", label: "Pedidos", icon: Package },
    { to: "/caixa", label: "Fechar Caixa", icon: Calculator },
    { to: "/tabelas", label: "Tabelas de Preços", icon: Table2 },
    { to: "/shopee", label: "Central Shopee", icon: ShoppingBag },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-400">Visão geral de vendas e operação</p>
        </div>
        <Link to="/nova-venda" data-testid="quick-nova-venda"
          className="bg-gradient-to-r from-pink-500 via-cyan-500 to-yellow-500 text-zinc-950 font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-95">
          <Plus size={16} /> Nova Venda
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Vendas hoje" value={data.vendas_hoje} icon={ShoppingCart} accent="cyan" />
        <Kpi label="Faturamento hoje" value={brl(data.faturamento_hoje)} icon={DollarSign} accent="pink" />
        <Kpi label="Faturamento mês" value={brl(data.faturamento_mes)} icon={TrendingUp} accent="yellow" />
        <Kpi label="Ticket médio" value={brl(data.ticket_medio)} icon={DollarSign} accent="green" />
        <Kpi label="A receber" value={brl(data.valores_a_receber)} icon={DollarSign} accent="red" />
        <Kpi label="Em produção" value={data.pedidos_producao} icon={Package} accent="cyan" />
        <Kpi label="Prontos" value={data.pedidos_prontos} icon={Clock} accent="green" />
        <Kpi label="Atrasados" value={data.pedidos_atrasados} icon={AlertTriangle} accent="red" />
      </div>

      <div className="flex flex-wrap gap-3">
        {shortcuts.map((s) => (
          <Link key={s.to} to={s.to} className="card-riosul px-4 py-3 flex items-center gap-2 hover:border-cyan-500/50">
            <s.icon size={16} className="text-cyan-400" />
            <span className="text-sm text-white font-medium">{s.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-riosul p-5 lg:col-span-2">
          <div className="text-sm text-zinc-400 mb-3 font-semibold">Vendas por dia (mês atual)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} />
                <Line type="monotone" dataKey="total" stroke="#EC4899" strokeWidth={2.5} dot={{ fill: "#06B6D4" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-riosul p-5">
          <div className="text-sm text-zinc-400 mb-3 font-semibold">Vendas por canal</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_channel}>
                <XAxis dataKey="name" stroke="#71717a" tick={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
                <Bar dataKey="total" fill="#06B6D4" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card-riosul p-5">
        <div className="text-sm text-zinc-400 mb-3 font-semibold">Vendas por vendedor (mês)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-500 uppercase tracking-wider">
              <tr><th className="text-left py-2">Vendedor</th><th className="text-right">Vendas</th><th className="text-right">Faturamento</th></tr>
            </thead>
            <tbody>
              {data.by_seller.map((s, i) => (
                <tr key={i} className="border-t border-zinc-800/60">
                  <td className="py-2 text-white">{s.seller_name}</td>
                  <td className="text-right text-zinc-300">{s.count}</td>
                  <td className="text-right text-cyan-400 font-mono">{brl(s.total)}</td>
                </tr>
              ))}
              {data.by_seller.length === 0 && <tr><td colSpan="3" className="text-zinc-500 py-4 text-center">Sem vendas no período</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
