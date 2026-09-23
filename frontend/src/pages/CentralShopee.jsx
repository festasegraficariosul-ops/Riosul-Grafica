import React, { useEffect, useState, useRef } from "react";
import api, { API } from "@/lib/api";
import { toast } from "sonner";
import { Upload, Search, Printer, FileDown, Image as ImageIcon, Trash2, Package, AlertTriangle, Edit } from "lucide-react";
import { fmtDate } from "@/lib/format";

const STATUSES = ["AGUARDANDO IMAGEM","PRONTO PARA PRODUÇÃO","EM PRODUÇÃO","PRODUZIDO","SEPARADO","DESPACHADO"];

export default function CentralShopee() {
  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState(""); const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const [importInfo, setImportInfo] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const fileRef = useRef();

  const load = () => {
    const params = {};
    if (q) params.q = q;
    if (statusFilter) params.status = statusFilter;
    api.get("/shopee/orders", { params }).then(r => setOrders(r.data));
  };
  useEffect(() => { load(); }, []);

  const importZip = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/shopee/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setImportInfo(data); toast.success(`${data.imported} pedidos importados`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao importar"); }
    finally { setLoading(false); }
  };

  const uploadImage = async (oid, file) => {
    const fd = new FormData(); fd.append("file", file);
    const { data } = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
    await api.post(`/shopee/orders/${oid}/images`, { url: data.url });
    toast.success("Imagem anexada"); load();
  };

  const changeStatus = async (oid, status) => { await api.put(`/shopee/orders/${oid}`, { status }); load(); };
  const delOrder = async (oid) => { if (!confirm("Excluir?")) return; await api.delete(`/shopee/orders/${oid}`); load(); };

  const openPdf = (path) => {
    const t = localStorage.getItem("access_token");
    window.open(`${API}${path}?auth=${encodeURIComponent(t||"")}`, "_blank");
  };
  const batchPdf = async (mode) => {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (!ids.length) return toast.error("Selecione ao menos 1 pedido");
    try {
      const res = await api.post("/shopee/batch-pdf", { ids, mode }, { responseType: "blob" });
      const url = URL.createObjectURL(res.data); const a = document.createElement("a");
      a.href = url; a.download = `shopee_${mode}.pdf`; a.click();
    } catch { toast.error("Erro"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-white">Central Shopee</h1>
          <p className="text-xs text-zinc-500">Importe o ZIP dos pedidos Shopee → gere PDFs e fichas de separação</p></div>
        <label className="cursor-pointer bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-500 text-white font-bold px-5 py-2.5 rounded-lg flex items-center gap-2">
          <Upload size={16} /> {loading ? "Importando..." : "Importar ZIP"}
          <input ref={fileRef} type="file" accept=".zip" hidden onChange={(e) => e.target.files[0] && importZip(e.target.files[0])} />
        </label>
      </div>

      {importInfo && (
        <div className="card-riosul p-4 text-sm">
          <div className="text-white font-semibold mb-1">Última importação</div>
          <div className="text-zinc-400">Pedidos importados: <span className="text-cyan-400 font-bold">{importInfo.imported}</span></div>
          {importInfo.duplicates?.length > 0 && <div className="text-yellow-400 text-xs mt-1">Duplicados ignorados: {importInfo.duplicates.join(", ")}</div>}
          {importInfo.skipped?.length > 0 && <div className="text-red-400 text-xs mt-1">Arquivos não suportados: {importInfo.skipped.map(s => s.file).join(", ")}</div>}
        </div>
      )}

      <div className="card-riosul p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]"><label className="text-xs text-zinc-500">Buscar</label>
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2">
            <Search size={14} className="text-zinc-500 mr-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Cliente ou nº do pedido" className="flex-1 bg-transparent text-sm text-white outline-none" />
          </div></div>
        <div><label className="text-xs text-zinc-500">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm">
            <option value="">Todos</option>{STATUSES.map(s => <option key={s}>{s}</option>)}
          </select></div>
        <button onClick={load} className="bg-cyan-500 text-white px-4 py-2 rounded text-sm font-bold">Filtrar</button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => batchPdf("documents")} className="bg-zinc-800 text-white px-3 py-2 rounded text-sm">PDF Etiquetas</button>
          <button onClick={() => batchPdf("fichas")} className="bg-zinc-800 text-white px-3 py-2 rounded text-sm">PDF Fichas</button>
          <button onClick={() => batchPdf("both")} className="bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-bold px-3 py-2 rounded text-sm">PDF Etiqueta+Ficha</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {orders.map((o) => (
          <div key={o.id} className="card-riosul p-3">
            <div className="flex items-start justify-between mb-2">
              <label className="flex items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={!!selected[o.id]} onChange={(e) => setSelected({ ...selected, [o.id]: e.target.checked })} /> selecionar</label>
              <div className="flex gap-1">
                <button onClick={() => setEditOrder(o)} className="text-cyan-400"><Edit size={14} /></button>
                <button onClick={() => delOrder(o.id)} className="text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
            {!o.identified && (
              <div className="text-[10px] text-yellow-400 mb-1 flex items-center gap-1"><AlertTriangle size={10} /> Não identificado — edite os dados</div>
            )}
            <div className="text-cyan-400 font-mono text-sm font-bold">#{o.order_number}</div>
            <div className="text-white text-sm font-semibold truncate">{o.customer_name || <span className="text-zinc-500 italic">Cliente não identificado</span>}</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {o.document_url && !o.is_image && (
                <a href={o.document_url} target="_blank" rel="noreferrer" className="h-24 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-cyan-400 text-xs">Etiqueta</a>
              )}
              {o.is_image && o.document_url && <img src={o.document_url} alt="doc" className="h-24 w-full object-cover rounded border border-zinc-800" />}
              <div className="h-24 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center overflow-hidden">
                {o.images?.length ? <img src={o.images[0]} alt="produto" className="w-full h-full object-cover" />
                  : <Package size={24} className="text-zinc-600" />}
              </div>
            </div>
            <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)} className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-xs">
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="flex flex-wrap gap-1 mt-2">
              <label className="cursor-pointer bg-cyan-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                <ImageIcon size={10} /> +Imagem
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && uploadImage(o.id, e.target.files[0])} />
              </label>
              <button onClick={() => openPdf(`/shopee/orders/${o.id}/ficha`)} className="bg-yellow-500 text-zinc-950 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1"><Printer size={10} /> Ficha</button>
              {o.document_url && <a href={o.document_url} target="_blank" rel="noreferrer" className="bg-zinc-800 text-white text-[10px] px-2 py-1 rounded">Ver etiqueta</a>}
            </div>
            {o.notes && <div className="text-[10px] text-zinc-400 mt-2 italic border-t border-zinc-800 pt-1">{o.notes}</div>}
          </div>
        ))}
        {orders.length === 0 && <div className="col-span-full text-center text-zinc-500 py-16">Nenhum pedido Shopee. Faça upload do ZIP acima.</div>}
      </div>

      {editOrder && <EditShopee order={editOrder} onClose={() => { setEditOrder(null); load(); }} />}
    </div>
  );
}

function EditShopee({ order, onClose }) {
  const [f, setF] = useState({ customer_name: order.customer_name || "", order_number: order.order_number, notes: order.notes || "", status: order.status });
  const save = async () => { await api.put(`/shopee/orders/${order.id}`, f); toast.success("Salvo"); onClose(); };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-riosul p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-3">Editar pedido Shopee</h3>
        <div className="space-y-2 text-sm">
          <div><label className="text-xs text-zinc-500">Cliente</label>
            <input value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" /></div>
          <div><label className="text-xs text-zinc-500">Nº do pedido</label>
            <input value={f.order_number} onChange={(e) => setF({ ...f, order_number: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" /></div>
          <div><label className="text-xs text-zinc-500">Observações</label>
            <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={3} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" /></div>
        </div>
        <button onClick={save} className="w-full mt-3 bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold py-2 rounded">Salvar</button>
      </div>
    </div>
  );
}
