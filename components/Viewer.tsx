"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Link as StarLink, Star } from "@/lib/types";
import Starfield from "./Starfield";
import SkyLayer, { GlowDefs } from "./SkyLayer";
import DreamCard from "./DreamCard";
import { useSize } from "./useSize";

type Props = {
  name: string;
  stars: Star[];
  links: StarLink[];
  isOwner: boolean;
  isPublished: boolean;
};

/** Read-only shared page for one constellation. */
export default function Viewer({ name, stars, links, isOwner, isPublished }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(shellRef);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = stars.find((s) => s.id === openId) ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function pick(target: EventTarget) {
    const g = (target as Element).closest<SVGGElement>(".star");
    setOpenId(g?.dataset.id ?? null);
  }

  return (
    <div className="sky-shell" ref={shellRef}>
      <Starfield />
      <svg
        className="sky"
        viewBox={`0 0 ${w || 1} ${h || 1}`}
        aria-label={`${name || "Untitled constellation"}. Select a star to read the dream.`}
        onClick={(e) => pick(e.target)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(e.target); } }}
      >
        <GlowDefs />
        {w > 0 && <SkyLayer stars={stars} links={links} w={w} h={h} selectedId={openId} animateLines />}
      </svg>

      <header className="topbar">
        <Link href="/" className="mark">Tala</Link>
      </header>
      <h1 className="view-title">{name || "Untitled constellation"}</h1>

      <div className="bar">
        <p>
          {isOwner && !isPublished
            ? "Only you can see this until you publish."
            : `${stars.length} ${stars.length === 1 ? "dream" : "dreams"}. Tap a star to read it.`}
        </p>
        {isOwner ? (
          <Link className="btn primary" href="/edit">Edit</Link>
        ) : (
          <Link className="btn primary" href="/edit">Make your own</Link>
        )}
        <Link className="btn" href="/galaxy">Galaxy</Link>
      </div>

      <aside className={`sheet${open ? " open" : ""}`} aria-label="Dream" aria-hidden={!open}>
        <div className="sheet-head">
          <span>Dream</span>
          <button className="close" onClick={() => setOpenId(null)} aria-label="Close">×</button>
        </div>
        {open && <DreamCard star={open} />}
      </aside>
    </div>
  );
}
