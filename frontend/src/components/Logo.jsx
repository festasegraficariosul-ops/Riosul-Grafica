import React from "react";

export default function Logo({ size = 32, subtitle = true }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <img src="/riosul-logo.png" alt="Rio Sul Festas & Gráfica" style={{ height: size, width: "auto" }} draggable={false} />
    </div>
  );
}
