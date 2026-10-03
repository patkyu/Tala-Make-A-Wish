"use client";

import { useEffect, useRef } from "react";

/** Twinkling background stars drawn on a canvas. Purely decorative. */
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, frame = 0;
    let dots: { x: number; y: number; r: number; p: number; s: number }[] = [];

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = Array.from({ length: Math.round((w * h) / 4200) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.1 + 0.2, p: Math.random() * 6.28, s: 0.4 + Math.random() * 1.4,
      }));
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#fff4d6";
      for (const d of dots) {
        ctx.globalAlpha = reduce ? 0.55 : 0.3 + 0.35 * Math.sin((t / 1000) * d.s + d.p);
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
      }
      if (!reduce) frame = requestAnimationFrame(draw);
    }

    size(); draw(0);
    const onResize = () => { size(); if (reduce) draw(0); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}
