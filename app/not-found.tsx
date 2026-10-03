import Link from "next/link";
import Starfield from "@/components/Starfield";

export default function NotFound() {
  return (
    <main className="sky-shell">
      <Starfield />
      <div className="center">
        <h1 className="hero-title" style={{ fontSize: "clamp(36px, 8vw, 64px)" }}>This part of the sky is empty</h1>
        <p className="hero-sub">The constellation may be unpublished, or the link is mistyped.</p>
        <Link className="btn primary" href="/galaxy">Explore the galaxy</Link>
      </div>
    </main>
  );
}
