import React, { useState } from "react";
import api from "@/lib/api";
import { Upload, FileDown, Eye } from "lucide-react";
import { toast } from "sonner";

const SAMPLE = `^XA
^FO50,50^ADN,36,20^FDRio Sul Festas & Gráfica^FS
^FO50,120^ADN,24,10^FDEtiqueta de Teste - Shopee^FS
^FO50,180^BY3^BCN,80,Y,N,N^FD1234567890^FS
^XZ`;

export default function Etiquetas() {
  const [zpl, setZpl] = useState(SAMPLE);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const doPreview = async () => {
    setLoading(true);
    try { const { data } = await api.post("/labels/zpl-preview", { zpl }); setPreview(data.png_base64); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro"); }
    finally { setLoading(false); }
  };
  const doPdf = async () => {
    setLoading(true);
    try {
      const res = await api.post("/labels/zpl-to-pdf", { zpl }, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = "etiquetas.pdf"; a.click();
      toast.success("PDF gerado");
    } catch (e) { toast.error("Erro ao gerar PDF"); }
    finally { setLoading(false); }
  };
  const onFile = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const txt = await f.text(); setZpl(txt);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Etiquetas Shopee <span className="text-xs text-zinc-500">ZPL → PDF 10×15cm</span></h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-riosul p-4 space-y-3">
          <label className="text-xs text-zinc-500 uppercase font-semibold">Cole/carregue o arquivo .ZPL</label>
          <input type="file" accept=".zpl,.txt" onChange={onFile} data-testid="zpl-file" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white text-sm" />
          <textarea value={zpl} onChange={(e) => setZpl(e.target.value)} rows={14} data-testid="zpl-text"
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-cyan-300 text-xs font-mono" />
          <div className="flex gap-2">
            <button onClick={doPreview} disabled={loading} data-testid="zpl-preview" className="flex-1 bg-cyan-500 text-white font-bold py-2 rounded text-sm flex items-center justify-center gap-1"><Eye size={14} /> Visualizar</button>
            <button onClick={doPdf} disabled={loading} data-testid="zpl-pdf" className="flex-1 bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-bold py-2 rounded text-sm flex items-center justify-center gap-1"><FileDown size={14} /> Gerar PDF</button>
          </div>
        </div>
        <div className="card-riosul p-4">
          <label className="text-xs text-zinc-500 uppercase font-semibold mb-2 block">Prévia (primeira etiqueta)</label>
          <div className="bg-white rounded p-2 min-h-[400px] flex items-center justify-center">
            {preview ? <img src={`data:image/png;base64,${preview}`} alt="preview" className="max-w-full" /> : <div className="text-zinc-500 text-sm">Clique em Visualizar</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
