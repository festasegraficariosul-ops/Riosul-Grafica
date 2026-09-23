import React from "react";

export default function Logo({ size = 28 }) {
  return (
    <div className="flex items-center gap-2 select-none" style={{ fontFamily: "Outfit" }}>
      <div className="font-black text-white" style={{ fontSize: size, lineHeight: 1 }}>
        Rio<span className="brand-gradient-text">S</span>ul
      </div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Festas & Gráfica</div>
    </div>
  );
}
