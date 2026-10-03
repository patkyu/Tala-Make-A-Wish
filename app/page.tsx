import Link from "next/link";
import Starfield from "@/components/Starfield";

export default function Home() {
  return (
    <main className="sky-shell">
      <Starfield />
      <div className="center">
        <h1 className="hero-title">Every dream is a star</h1>
        <p className="hero-sub">
          Place your dreams in the sky, connect them into your own constellation, and share it with the galaxy.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn primary" href="/edit">Start your constellation</Link>
          <Link className="btn" href="/galaxy">Explore the galaxy</Link>
        </div>
      </div>
    </main>
  );
}
