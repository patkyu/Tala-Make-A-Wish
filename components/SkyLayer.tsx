import type { Link, Star } from "@/lib/types";
import { starRadius } from "@/lib/dreams";

/** Put once inside any <svg> that renders stars. */
export function GlowDefs() {
  return (
    <defs>
      <radialGradient id="glow">
        <stop offset="0" stopColor="#fff4d6" stopOpacity=".55" />
        <stop offset=".35" stopColor="#f3c969" stopOpacity=".18" />
        <stop offset="1" stopColor="#f3c969" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

type Props = {
  stars: Star[];
  links: Link[];
  w: number;
  h: number;
  selectedId?: string | null;
  sourceId?: string | null;
  animateLines?: boolean;
  showLabels?: boolean;
  focusable?: boolean;
};

/** Draws connection lines and stars. Coordinates are stored 0..1 and scaled to w/h. */
export default function SkyLayer({
  stars, links, w, h, selectedId, sourceId, animateLines, showLabels = true, focusable = true,
}: Props) {
  const byId = new Map(stars.map((s) => [s.id, s]));
  return (
    <g>
      {links.map((l, i) => {
        const a = byId.get(l.from_star), b = byId.get(l.to_star);
        if (!a || !b) return null;
        return (
          <line
            key={`${l.from_star}-${l.to_star}`}
            className={`link${animateLines ? " draw" : ""}`}
            pathLength={1}
            style={animateLines ? { animationDelay: `${i * 0.25}s` } : undefined}
            x1={a.x * w} y1={a.y * h} x2={b.x * w} y2={b.y * h}
          />
        );
      })}
      {stars.map((s) => {
        const r = starRadius(s);
        const cls = ["star"];
        if (s.id === selectedId) cls.push("selected");
        if (s.id === sourceId) cls.push("source");
        const label = s.title.length > 26 ? s.title.slice(0, 25) + "…" : s.title;
        return (
          <g
            key={s.id}
            className={cls.join(" ")}
            data-id={s.id}
            tabIndex={focusable ? 0 : -1}
            role="button"
            aria-label={s.title || "Untitled dream"}
            transform={`translate(${s.x * w} ${s.y * h})`}
          >
            <circle className="glow" r={r * 5} />
            <circle className="ring" r={r + 7} />
            <circle className="core" r={r} />
            <circle className="hit" r={22} />
            {showLabels && label && (
              <text className="label" y={r + 20} textAnchor="middle">{label}</text>
            )}
          </g>
        );
      })}
    </g>
  );
}
