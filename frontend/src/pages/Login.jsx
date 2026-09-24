import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { formatApiError } from "@/lib/format";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { user, login: authenticate } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user !== false) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault(); setErr(""); setLoading(true);
    try { await authenticate(username, password); nav("/"); }
    catch (e) { setErr(formatApiError(e.response?.data?.detail) || "Erro ao entrar"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] grain px-4">
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{ background: "radial-gradient(600px circle at 20% 30%, rgba(236,72,153,0.15), transparent 60%), radial-gradient(600px circle at 80% 70%, rgba(6,182,212,0.15), transparent 60%)" }} />
      <div className="w-full max-w-md relative">
        <div className="card-riosul p-8 shadow-2xl shadow-black/50">
          <div className="mb-6 text-center"><Logo size={36} /></div>
          <h1 className="text-2xl font-bold text-white mb-1">Bem-vindo</h1>
          <p className="text-sm text-zinc-400 mb-6">Acesse o sistema de gestão da Rio Sul</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Login</label>
              <input data-testid="login-username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Digite seu login"
                className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 text-sm" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Senha</label>
              <input data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 text-sm" />
            </div>
            {err && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{err}</div>}
            <button data-testid="login-submit" disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-500 hover:opacity-95 text-white font-bold px-5 py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />} Entrar
            </button>
          </form>
          <div className="mt-6 text-[11px] text-zinc-500 text-center leading-relaxed">
            Rio Sul Festas & Gráfica · Sistema Interno
          </div>
        </div>
      </div>
    </div>
  );
}
