"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { GalaxyConstellation, Star } from "@/lib/types";
import Starfield from "./Starfield";
import SkyLayer, { GlowDefs } from "./SkyLayer";
import DreamCard from "./DreamCard";
import { useSize } from "./useSize";

const BOX = 420;            // world units each constellation occupies
const SPACING = 470;        // distance scale of the spiral
const GOLDEN = 2.39996323;  // golden angle in radians

type View = { cx: number; cy: number; scale: number };

/** All published constellations, arranged along a golden-angle spiral. Drag to pan, scroll or pinch to zoom. */
export default function Galaxy({ constellations }: { constellations: GalaxyConstellation[] }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(shellRef);
  const [view, setView] = useState<View>({ cx: 0, cy: 0, scale: 0.5 });
  const [open, setOpen] = useState<{ star: Star; c: GalaxyConstellation } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef({ moved: false, pinch: 0 });

  const placed = useMemo(
    () =>
      constellations.map((c, i) => {
        const r = SPACING * Math.sqrt(i);
        const t = i * GOLDEN;
        return { c, x: r * Math.cos(t), y: r * Math.sin(t) };
      }),
    [constellations]
  );

  // Fit the first few constellations on first measure.
  const fitted = useRef(false);
  useEffect(() => {
    if (!w || fitted.current) return;
    fitted.current = true;
    const span = SPACING * Math.sqrt(Math.min(constellations.length, 8)) * 2 + BOX;
    setView({ cx: 0, cy: 0, scale: Math.min(1.2, Math.min(w, h) / span) });
  }, [w, h, constellations.length]);

  const vw = (w || 1) / view.scale, vh = (h || 1) / view.scale;
  const viewBox = `${view.cx - vw / 2} ${view.cy - vh / 2} ${vw} ${vh}`;

  function zoom(factor: number) {
    setView((v) => ({ ...v, scale: Math.min(4, Math.max(0.05, v.scale * factor)) }));
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current.moved = false;
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      drag.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (drag.current.pinch) zoom(d / drag.current.pinch);
      drag.current.pinch = d;
      drag.current.moved = true;
      return;
    }
    const dx = next.x - prev.x, dy = next.y - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) {
      drag.current.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setView((v) => ({ ...v, cx: v.cx - dx / v.scale, cy: v.cy - dy / v.scale }));
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) drag.current.pinch = 0;
  }

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    if (drag.current.moved) return;
    const g = (e.target as Element).closest<SVGGElement>(".star");
    const cid = (e.target as Element).closest<SVGGElement>("[data-cid]")?.dataset.cid;
    if (!g || !cid) { setOpen(null); return; }
    const c = constellations.find((x) => x.id === cid);
    const star = c?.stars.find((s) => s.id === g.dataset.id);
    if (c && star) setOpen({ star, c });
  }

  return (
    <div className="sky-shell" ref={shellRef}>
      <Starfield />
      <svg
        className="sky"
        viewBox={viewBox}
        style={{ cursor: "grab" }}
        aria-label="The galaxy of published constellations. Drag to explore."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1)}
        onClick={onClick}
      >
        <GlowDefs />
        {placed.map(({ c, x, y }) => (
          <g key={c.id} data-cid={c.id} transform={`translate(${x - BOX / 2} ${y - BOX / 2})`}>
            <SkyLayer stars={c.stars} links={c.connections} w={BOX} h={BOX} showLabels={false} focusable={false} />
            <a href={`/c/${c.slug}`}>
              <text className="galaxy-name" x={BOX / 2} y={BOX + 18} textAnchor="middle">
                {c.name || "Untitled constellation"}
              </text>
            </a>
          </g>
        ))}
      </svg>

      <header className="topbar">
        <Link href="/" className="mark">Tala</Link>
      </header>

      <div className="zoom">
        <button className="btn" onClick={() => zoom(1.25)} aria-label="Zoom in">+</button>
        <button className="btn" onClick={() => zoom(0.8)} aria-label="Zoom out">−</button>
      </div>

      <div className="bar">
        <p>
          {constellations.length === 0
            ? "The galaxy is still empty. Publish the first constellation."
            : <><strong>{constellations.length} {constellations.length === 1 ? "constellation" : "constellations"}.</strong> Drag to explore, tap a star to read it.</>}
        </p>
        <Link className="btn primary" href="/edit">Make your own</Link>
      </div>

      <aside className={`sheet${open ? " open" : ""}`} aria-label="Dream" aria-hidden={!open}>
        <div className="sheet-head">
          <span>{open?.c.name || "Untitled constellation"}</span>
          <button className="close" onClick={() => setOpen(null)} aria-label="Close">×</button>
        </div>
        {open && (
          <>
            <DreamCard star={open.star} />
            <div className="actions">
              <Link className="btn primary" href={`/c/${open.c.slug}`}>View whole constellation</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
