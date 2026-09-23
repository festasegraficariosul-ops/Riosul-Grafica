import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NovaVenda from "@/pages/NovaVenda";
import { Vendas, VendaDetail } from "@/pages/Vendas";
import Clientes from "@/pages/Clientes";
import Pedidos from "@/pages/Pedidos";
import Produtos from "@/pages/Produtos";
import Categorias from "@/pages/Categorias";
import Funcionarios from "@/pages/Funcionarios";
import Vales from "@/pages/Vales";
import Caixa from "@/pages/Caixa";
import Relatorios from "@/pages/Relatorios";
import Etiquetas from "@/pages/Etiquetas";
import Configuracoes from "@/pages/Configuracoes";

function Protected({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading || user === null) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/nova-venda" element={<NovaVenda />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/vendas/:id" element={<VendaDetail />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/caixa" element={<Caixa />} />
            <Route path="/etiquetas-shopee" element={<Etiquetas />} />
            <Route path="/produtos" element={<Protected adminOnly><Produtos /></Protected>} />
            <Route path="/categorias" element={<Protected adminOnly><Categorias /></Protected>} />
            <Route path="/funcionarios" element={<Protected adminOnly><Funcionarios /></Protected>} />
            <Route path="/vales" element={<Protected adminOnly><Vales /></Protected>} />
            <Route path="/relatorios" element={<Protected adminOnly><Relatorios /></Protected>} />
            <Route path="/configuracoes" element={<Protected adminOnly><Configuracoes /></Protected>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
