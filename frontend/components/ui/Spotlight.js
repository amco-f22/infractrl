"use client";

import { useEffect, useRef } from "react";

export function Spotlight() {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const { clientX, clientY } = e;
      containerRef.current.style.setProperty("--x", `${clientX}px`);
      containerRef.current.style.setProperty("--y", `${clientY}px`);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
      style={{
        background: `radial-gradient(750px circle at var(--x, 50vw) var(--y, 30vh), rgba(74, 222, 128, 0.045) 0%, rgba(34, 211, 238, 0.055) 45%, transparent 75%)`,
      }}
    />
  );
}
