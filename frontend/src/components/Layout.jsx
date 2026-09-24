import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Logo from "./Logo";
import { LayoutDashboard, ShoppingCart, ListOrdered, Users, ClipboardList, Package, Tags, UserCog,
  Wallet, Calculator, BarChart3, Table2, ShoppingBag, Settings, LogOut, Menu, X } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/nova-venda", label: "Nova Venda", icon: ShoppingCart, highlight: true },
  { to: "/vendas", label: "Vendas", icon: ListOrdered },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/categorias", label: "Categorias", icon: Tags, admin: true },
  { to: "/funcionarios", label: "Funcionários", icon: UserCog, admin: true },
  { to: "/vales", label: "Vales", icon: Wallet },
  { to: "/caixa", label: "Fechamento Caixa", icon: Calculator },
  { to: "/tabelas", label: "Tabelas de Preços", icon: Table2 },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, admin: true },
  { to: "/shopee", label: "Central Shopee", icon: ShoppingBag },
  { to: "/configuracoes", label: "Configurações", icon: Settings, admin: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav2 = useNavigate();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const items = nav.filter((n) => !n.admin || isAdmin);

  return (
    <div className="min-h-screen flex bg-[#09090B] grain">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 h-screen z-40 w-64 shrink-0 bg-zinc-950/95 border-r border-zinc-800/80 backdrop-blur-xl transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-4 py-4 border-b border-zinc-800/80 flex items-center justify-between gap-2">
          <Link to="/" onClick={() => setOpen(false)} className="flex-1"><Logo size={56} /></Link>
          <button className="lg:hidden text-zinc-400" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-160px)]">
          {items.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink key={n.to} to={n.to} end={n.to === "/"} data-testid={`nav-${n.to.replace(/\//g,"") || "dashboard"}`}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive ? "bg-gradient-to-r from-pink-500/20 via-cyan-500/20 to-yellow-500/10 border border-pink-500/40 text-white"
                    : n.highlight ? "text-white bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}>
                <Icon size={16} />
                <span>{n.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full p-3 border-t border-zinc-800/80 bg-zinc-950">
          <div className="text-xs text-zinc-500 mb-1">Logado como</div>
          <div className="text-sm text-white font-semibold">{user?.name}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{user?.role}</div>
          <button data-testid="logout-btn" onClick={async () => { await logout(); nav2("/login"); }}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-pink-500/50 text-xs font-medium">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-zinc-950/90 border-b border-zinc-800/80 backdrop-blur-xl px-4 md:px-6 py-3 flex items-center gap-4 lg:hidden">
          <button className="text-zinc-300" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <Logo size={36} />
        </header>
        <main className="p-4 md:p-6 lg:p-8 relative z-10">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="top-right" theme="dark" />
    </div>
  );
}
