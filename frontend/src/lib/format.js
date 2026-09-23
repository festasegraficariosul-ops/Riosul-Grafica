export const brl = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtDate = (iso) => { if (!iso) return "-"; const d = new Date(iso); return d.toLocaleDateString("pt-BR"); };
export const fmtDateTime = (iso) => { if (!iso) return "-"; const d = new Date(iso); return d.toLocaleString("pt-BR"); };
export const weekday = (iso) => { if (!iso) return "-"; return new Date(iso).toLocaleDateString("pt-BR", { weekday: "long" }); };
export const todayISO = () => new Date().toISOString().slice(0, 10);
export function formatApiError(detail) {
  if (!detail) return "Erro desconhecido";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}
