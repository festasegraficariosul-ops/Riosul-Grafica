import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { brl } from "@/lib/format";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Plus, Minus, Trash2, Package, Ruler, ArrowLeft, CheckCircle2, User, Phone, Star, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const STATUSES = ["PEDIDO RECEBIDO","AGUARDANDO ARTE","ARTE EM CRIAÇÃO","AGUARDANDO APROVAÇÃO","ARTE APROVADA","EM PRODUÇÃO","PRONTO","ENTREGUE"];

const ProductImage = ({ url, alt, size = 96 }) => (
  <div className="rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center" style={{ width: size, height: size }}>
    {url ? <img src={url} alt={alt} className="w-full h-full object-cover" onError={(e)=>{e.target.style.display='none'}} />
      : <Package size={size/2.5} className="text-zinc-700" />}
  </div>
);

export default function NovaVenda({ editMode = false }) {
  const nav = useNavigate();
  const { id: routeId } = useParams();
  const editSaleId = editMode ? routeId : null;
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [channels, setChannels] = useState([]);
  const [methods, setMethods] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [q, setQ] = useState("");
  const [selCat, setSelCat] = useState(null);
  const [showFav, setShowFav] = useState(false);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ id: null, name: "", phone: "" });
  const [channel, setChannel] = useState("Loja");
  const [status, setStatus] = useState("PEDIDO RECEBIDO");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [surcharge, setSurcharge] = useState(0);
  const [globalDisc, setGlobalDisc] = useState(0);
  const [payments, setPayments] = useState([]);
  const [showM2, setShowM2] = useState(null);
  const [showTier, setShowTier] = useState(null);
  const [orderNumber, setOrderNumber] = useState(null);

  useEffect(() => {
    api.get("/categories").then((r) => setCats(r.data.filter((c) => c.active)));
    api.get("/products").then((r) => setProducts(r.data.filter((p) => p.active)));
    api.get("/channels").then((r) => setChannels(r.data.filter((c) => c.active)));
    api.get("/payment_methods").then((r) => setMethods(r.data.filter((c) => c.active)));
    api.get("/customers").then((r) => setCustomers(r.data));
    api.get("/reports/top-products").catch(() => ({ data: [] })).then((r) => setTopProducts(r?.data || []));
  }, []);

  useEffect(() => {
    if (!editSaleId) return;
    api.get(`/sales/${editSaleId}`).then(({ data }) => {
      setCart(data.items || []);
      setCustomer({ id: data.customer_id, name: data.customer_name, phone: data.customer_phone });
      setChannel(data.channel); setStatus(data.status);
      setDeliveryDate(data.delivery_date || ""); setNotes(data.notes || "");
      setSurcharge(data.surcharge || 0); setGlobalDisc(data.discount || 0);
      setPayments(data.payments || []); setOrderNumber(data.order_number);
    }).catch(() => toast.error("Erro ao carregar pedido"));
  }, [editSaleId]);

  const filtered = useMemo(() => {
    let list = products;
    if (showFav) list = list.filter((p) => p.favorite);
    if (selCat) list = list.filter((p) => p.category_id === selCat);
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(s) ||
        (p.variations || []).some((v) => v.name.toLowerCase().includes(s)) ||
        (cats.find(c => c.id === p.category_id)?.name || "").toLowerCase().includes(s));
    }
    return list;
  }, [products, selCat, q, showFav, cats]);

  const mostSold = useMemo(() => {
    const names = topProducts.slice(0, 8).map((t) => t.name);
    return products.filter((p) => names.includes(p.name)).slice(0, 8);
  }, [products, topProducts]);

  const addItem = (p, variation) => {
    const priceType = p.price_type || "fixed";
    if (priceType === "per_m2") { setShowM2({ product: p, variation }); return; }
    if (priceType === "tiered") { setShowTier({ product: p, variation }); return; }
    const price = variation ? variation.price : p.price;
    let unit_price = price;
    if (priceType === "variable" || p.is_starting_price) {
      const v = prompt(`Preço final para ${p.name}${variation ? " - " + variation.name : ""}${p.is_starting_price ? " (a partir de " + price + ")" : ""}`, price || "");
      if (v === null) return;
      unit_price = parseFloat(v);
    }
    setCart([...cart, {
      product_id: p.id, variation_id: variation?.id, product_name: p.name,
      variation_name: variation?.name || "", quantity: 1, catalog_price: price,
      unit_price, discount: 0, subtotal: unit_price, notes: "", image_url: p.image_url || "",
    }]);
    toast.success(`${p.name} adicionado`);
  };

  const confirmM2 = (w, h, qty, price) => {
    const p = showM2.product;
    const area = w * h * qty;
    const calc = area * price;
    const final = Math.max(calc, p.m2_min_price || 0);
    setCart([...cart, {
      product_id: p.id, variation_id: showM2.variation?.id, product_name: p.name,
      variation_name: showM2.variation?.name || "", quantity: qty, catalog_price: price,
      unit_price: final / qty, discount: 0, subtotal: final,
      m2_data: { width: w, height: h, price_per_m2: price, area, min_price: p.m2_min_price },
      image_url: p.image_url || "",
    }]);
    setShowM2(null);
  };

  const confirmTier = (folhas, cover50, price_folha) => {
    const p = showTier.product;
    let subtotal = folhas * price_folha;
    if (cover50) subtotal += folhas * 0.25;
    setCart([...cart, {
      product_id: p.id, product_name: p.name, variation_name: `${folhas} folhas${cover50 ? " · +50% cobertura" : ""}`,
      quantity: folhas, catalog_price: price_folha, unit_price: subtotal / folhas, discount: 0,
      subtotal, notes: "", image_url: p.image_url || "",
    }]);
    setShowTier(null);
  };

  const updateItem = (i, field, val) => {
    const c = [...cart];
    c[i][field] = val;
    c[i].subtotal = (c[i].unit_price * c[i].quantity) - (c[i].discount || 0);
    setCart(c);
  };

  const subtotal = cart.reduce((s, it) => s + (it.subtotal || 0), 0);
  const total = subtotal - Number(globalDisc || 0) + Number(surcharge || 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const findCustomer = () => {
    const phone = customer.phone.trim();
    if (!phone) return;
    const match = customers.find((c) => c.phone === phone);
    if (match) { setCustomer(match); toast.success(`Cliente ${match.name} encontrado`); }
  };

  const finalize = async () => {
    if (cart.length === 0) { toast.error("Carrinho vazio"); return; }
    const payload = {
      customer_id: customer.id || null,
      customer_name: customer.name || "",
      customer_phone: customer.phone || "",
      items: cart, discount: Number(globalDisc || 0), surcharge: Number(surcharge || 0),
      total, paid: totalPaid, payments, channel, status,
      delivery_date: deliveryDate || null, notes,
    };
    try {
      if (editSaleId) {
        await api.put(`/sales/${editSaleId}`, payload);
        toast.success(`Pedido #${orderNumber} atualizado`);
        nav(`/vendas/${editSaleId}`);
      } else {
        const { data } = await api.post("/sales", payload);
        toast.success(`Venda #${data.order_number} registrada`);
        nav(`/vendas/${data.id}`);
      }
    } catch (e) { toast.error("Erro ao salvar"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(-1)} className="text-zinc-400 hover:text-white"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-bold text-white">{editSaleId ? `Editar Pedido #${orderNumber || ""}` : "Nova Venda"}</h1>
        </div>
        <Link to="/tabelas" className="text-xs text-cyan-400 hover:text-white flex items-center gap-1"><Table2 size={14} /> Ver tabelas</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <div className="card-riosul p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search size={16} className="text-zinc-500" />
              <input data-testid="prod-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto, categoria, variação, tamanho..."
                className="flex-1 bg-transparent text-sm text-white outline-none" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setShowFav(!showFav); setSelCat(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 ${showFav ? "bg-yellow-500/20 border-yellow-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>
                <Star size={12} className={showFav ? "fill-yellow-500" : ""} /> Favoritos
              </button>
              <button onClick={() => { setSelCat(null); setShowFav(false); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${!selCat && !showFav ? "bg-pink-500/20 border-pink-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>Todas</button>
              {cats.map((c) => (
                <button key={c.id} data-testid={`cat-${c.id}`} onClick={() => { setSelCat(c.id); setShowFav(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${selCat === c.id ? "bg-cyan-500/20 border-cyan-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-cyan-500/50"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {!selCat && !q && !showFav && mostSold.length > 0 && (
            <div className="card-riosul p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2 font-semibold">Mais vendidos</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {mostSold.map((p) => (
                  <button key={p.id} onClick={() => addItem(p, null)} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50">
                    <ProductImage url={p.image_url} alt={p.name} size={36} />
                    <div className="text-left"><div className="text-xs text-white font-semibold">{p.name}</div>
                      <div className="text-[10px] text-yellow-400 font-mono">{p.price_type === "fixed" ? brl(p.price) : p.price_type}</div></div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <div key={p.id} className="card-riosul p-3 flex gap-3">
                <ProductImage url={p.image_url} alt={p.name} size={80} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div className="text-sm font-bold text-white truncate">{p.name}</div>
                    {p.favorite && <Star size={12} className="text-yellow-500 fill-yellow-500 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-zinc-500 mb-1">{p.unit}
                    · <span className="text-yellow-400 font-mono">
                      {p.is_starting_price ? "A partir de " + brl(p.price) : p.price_type === "variable" ? "preço na venda" : p.price_type === "per_m2" ? brl(p.m2_price) + "/m²" : p.price_type === "tiered" ? "por faixa" : brl(p.price)}
                    </span>
                  </div>
                  {p.variations && p.variations.length > 0 ? (
                    <div className="space-y-1 mt-1">
                      {p.variations.filter((v) => v.active).map((v) => (
                        <button key={v.id} data-testid={`add-${p.id}-${v.id}`} onClick={() => addItem(p, v)}
                          className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 text-[11px]">
                          <span className="text-white truncate">{v.name}</span>
                          <span className="text-yellow-400 font-mono shrink-0 ml-2">{brl(v.price)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button data-testid={`add-${p.id}`} onClick={() => addItem(p, null)}
                      className="w-full mt-1 bg-gradient-to-r from-pink-500 to-cyan-500 text-white text-xs font-bold px-2 py-1.5 rounded flex items-center justify-center gap-1">
                      <Plus size={12} /> Adicionar
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="col-span-full text-center text-zinc-500 py-10">Nenhum produto encontrado.</div>}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-3 lg:sticky lg:top-4 self-start">
          <div className="card-riosul p-4">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2 font-semibold">Cliente <span className="text-zinc-600 normal-case">(criado automaticamente)</span></div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                <Phone size={14} className="text-zinc-500" />
                <input data-testid="cust-phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value, id: null })} onBlur={findCustomer} placeholder="Telefone/WhatsApp" className="flex-1 bg-transparent text-sm text-white outline-none" />
              </div>
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                <User size={14} className="text-zinc-500" />
                <input data-testid="cust-name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Nome do cliente" className="flex-1 bg-transparent text-sm text-white outline-none" />
              </div>
            </div>
          </div>

          <div className="card-riosul p-4 max-h-96 overflow-y-auto">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2 font-semibold">Carrinho ({cart.length})</div>
            {cart.length === 0 && <div className="text-sm text-zinc-500 py-6 text-center">Adicione produtos</div>}
            <div className="space-y-2">
              {cart.map((it, i) => (
                <div key={i} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-semibold truncate">{it.product_name}</div>
                      {it.variation_name && <div className="text-[10px] text-cyan-400">{it.variation_name}</div>}
                    </div>
                    <button onClick={() => setCart(cart.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <button onClick={() => updateItem(i, "quantity", Math.max(1, it.quantity - 1))} className="w-6 h-6 rounded bg-zinc-800 text-white"><Minus size={12} className="mx-auto" /></button>
                    <input type="number" value={it.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} className="w-14 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-center text-white" />
                    <button onClick={() => updateItem(i, "quantity", it.quantity + 1)} className="w-6 h-6 rounded bg-zinc-800 text-white"><Plus size={12} className="mx-auto" /></button>
                    <span className="text-zinc-500 mx-1">×</span>
                    <input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))} className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white" />
                    <span className="ml-auto text-yellow-400 font-mono font-bold">{brl(it.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-riosul p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><label className="text-zinc-500">Desconto</label>
                <input type="number" step="0.01" value={globalDisc} onChange={(e) => setGlobalDisc(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white" /></div>
              <div><label className="text-zinc-500">Acréscimo</label>
                <input type="number" step="0.01" value={surcharge} onChange={(e) => setSurcharge(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><label className="text-zinc-500">Canal</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white">
                  {channels.map((c) => <option key={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className="text-zinc-500">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white">
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select></div>
            </div>
            <div className="text-xs"><label className="text-zinc-500">Prazo de entrega</label>
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white" /></div>
            <div className="text-xs"><label className="text-zinc-500">Observações</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white" /></div>

            <div className="text-xs">
              <label className="text-zinc-500 flex items-center justify-between">Pagamentos
                <button onClick={() => setPayments([...payments, { method: methods[0]?.name || "PIX", amount: 0 }])} className="text-cyan-400"><Plus size={12} /></button>
              </label>
              {payments.map((p, i) => (
                <div key={i} className="flex gap-1 mt-1">
                  <select value={p.method} onChange={(e) => { const c = [...payments]; c[i].method = e.target.value; setPayments(c); }} className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white">
                    {methods.map((m) => <option key={m.id}>{m.name}</option>)}
                  </select>
                  <input type="number" step="0.01" value={p.amount} onChange={(e) => { const c = [...payments]; c[i].amount = Number(e.target.value); setPayments(c); }} className="w-24 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white" />
                  <button onClick={() => setPayments(payments.filter((_, j) => j !== i))} className="text-red-400"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-800 space-y-1 text-sm">
              <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span className="font-mono">{brl(subtotal)}</span></div>
              <div className="flex justify-between text-white font-bold text-xl"><span>Total</span><span className="font-mono brand-gradient-text">{brl(total)}</span></div>
              <div className="flex justify-between text-zinc-400"><span>Pago</span><span className="font-mono">{brl(totalPaid)}</span></div>
              <div className="flex justify-between text-yellow-400"><span>Saldo</span><span className="font-mono font-bold">{brl(total - totalPaid)}</span></div>
            </div>
            <button data-testid="finalizar-venda" onClick={finalize}
              className="w-full mt-2 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> {editSaleId ? "Salvar Pedido" : "Finalizar Venda"}
            </button>
          </div>
        </div>
      </div>

      {showM2 && <M2Modal product={showM2.product} onClose={() => setShowM2(null)} onConfirm={confirmM2} />}
      {showTier && <TierModal product={showTier.product} onClose={() => setShowTier(null)} onConfirm={confirmTier} />}
    </div>
  );
}

function M2Modal({ product, onClose, onConfirm }) {
  const [w, setW] = useState(1); const [h, setH] = useState(1);
  const [qty, setQty] = useState(1); const [price, setPrice] = useState(product.m2_price || 0);
  const area = w * h * qty; const calc = area * price;
  const final = Math.max(calc, product.m2_min_price || 0);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="card-riosul p-6 max-w-md w-full">
        <div className="flex items-center gap-2 mb-4"><Ruler className="text-cyan-400" size={20} />
          <h3 className="text-lg font-bold text-white">Calculadora por M² — {product.name}</h3></div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><label className="text-zinc-500 text-xs">Largura (m)</label><input type="number" step="0.01" value={w} onChange={(e) => setW(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" /></div>
          <div><label className="text-zinc-500 text-xs">Altura (m)</label><input type="number" step="0.01" value={h} onChange={(e) => setH(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" /></div>
          <div><label className="text-zinc-500 text-xs">Quantidade</label><input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" /></div>
          <div><label className="text-zinc-500 text-xs">Preço / m²</label><input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" /></div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-sm space-y-1">
          <div className="flex justify-between text-zinc-400"><span>Área total (m²)</span><span className="font-mono">{area.toFixed(2)}</span></div>
          <div className="flex justify-between text-zinc-400"><span>Cálculo</span><span className="font-mono">{brl(calc)}</span></div>
          <div className="flex justify-between text-zinc-400"><span>Mínimo</span><span className="font-mono">{brl(product.m2_min_price || 0)}</span></div>
          <div className="flex justify-between text-white font-bold"><span>Total</span><span className="brand-gradient-text font-mono text-lg">{brl(final)}</span></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 bg-zinc-800 text-white py-2 rounded-lg">Cancelar</button>
          <button onClick={() => onConfirm(w, h, qty, price)} className="flex-1 bg-cyan-500 text-white font-bold py-2 rounded-lg">Adicionar</button>
        </div>
      </div>
    </div>
  );
}

function TierModal({ product, onClose, onConfirm }) {
  const [folhas, setFolhas] = useState(1);
  const [cover50, setCover50] = useState(false);
  const tiers = product.tiers || [];
  const priceFolha = useMemo(() => {
    const t = tiers.find((x) => folhas >= x.min_qty && folhas <= x.max_qty);
    return t ? t.price : (product.price || 0);
  }, [folhas, tiers, product.price]);
  const total = folhas * priceFolha + (cover50 ? folhas * 0.25 : 0);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="card-riosul p-6 max-w-lg w-full">
        <h3 className="text-lg font-bold text-white mb-3">Cálculo por faixa — {product.name}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><label className="text-zinc-500 text-xs">Nº de folhas</label>
            <input type="number" min="1" value={folhas} onChange={(e) => setFolhas(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white" /></div>
          <div><label className="text-zinc-500 text-xs">Preço/folha atual</label>
            <div className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-yellow-400 font-mono">{brl(priceFolha)}</div></div>
        </div>
        <label className="flex items-center gap-2 mt-3 text-sm text-white">
          <input type="checkbox" checked={cover50} onChange={(e) => setCover50(e.target.checked)} />
          Impressão colorida com cobertura acima de 50% (+ R$ 0,25/folha)
        </label>
        <div className="mt-3 p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-sm">
          <div className="flex justify-between text-white font-bold"><span>Total</span><span className="brand-gradient-text font-mono text-lg">{brl(total)}</span></div>
          <div className="text-[11px] text-zinc-500 mt-1">Faixas: {tiers.map((t) => `${t.min_qty}${t.max_qty >= 99999 ? "+" : "-"+t.max_qty}: ${brl(t.price)}`).join(" · ")}</div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 bg-zinc-800 text-white py-2 rounded-lg">Cancelar</button>
          <button onClick={() => onConfirm(folhas, cover50, priceFolha)} className="flex-1 bg-cyan-500 text-white font-bold py-2 rounded-lg">Adicionar</button>
        </div>
      </div>
    </div>
  );
}
