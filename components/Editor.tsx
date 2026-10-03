"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Constellation, Link as StarLink, Star } from "@/lib/types";
import { PHOTO_BUCKET, downscaleImage, orderPair, photoUrl, spotifyTrackId } from "@/lib/dreams";
import Starfield from "./Starfield";
import SkyLayer, { GlowDefs } from "./SkyLayer";
import SpotifyEmbed from "./SpotifyEmbed";
import { useSize } from "./useSize";

type Props = {
  constellation: Constellation;
  initialStars: Star[];
  initialLinks: StarLink[];
  userId: string;
};

type Press = { id: string | null; sx: number; sy: number; moved: boolean };

const isEmpty = (s: Star) => !s.title && !s.body && !s.photo_path && !s.spotify_track_id;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function Editor({ constellation, initialStars, initialLinks, userId }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [stars, setStars] = useState<Star[]>(initialStars);
  const [links, setLinks] = useState<StarLink[]>(initialLinks);
  const [name, setName] = useState(constellation.name);
  const [published, setPublished] = useState(constellation.is_published);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [songInput, setSongInput] = useState("");
  const [pending, setPending] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const shellRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { w, h } = useSize(shellRef);

  // Latest stars for event handlers that outlive a render.
  const starsRef = useRef(stars);
  starsRef.current = stars;

  const press = useRef<Press | null>(null);
  const newStarId = useRef<string | null>(null);
  const inserts = useRef(new Map<string, PromiseLike<unknown>>());
  const patches = useRef(new Map<string, Partial<Star>>());
  const timers = useRef(new Map<string, number>());
  const nameTimer = useRef<number | undefined>(undefined);
  const toastTimer = useRef<number | undefined>(undefined);

  const editing = stars.find((s) => s.id === editingId) ?? null;
  const shareUrl = `${origin}/c/${constellation.slug}`;

  useEffect(() => setOrigin(window.location.origin), []);

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }

  /** Runs a Supabase call, tracks the "Saving" state, and reports errors. */
  async function run(label: string, q: PromiseLike<{ error: { message: string } | null }>) {
    setPending((p) => p + 1);
    try {
      const { error } = await q;
      if (error) showToast(`${label} didn't save: ${error.message}`);
      return !error;
    } finally {
      setPending((p) => p - 1);
    }
  }

  /* ---------- star updates (debounced) ---------- */

  function flush(id: string) {
    const patch = patches.current.get(id);
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    if (!patch) return;
    patches.current.delete(id);
    const waitForInsert = inserts.current.get(id) ?? Promise.resolve();
    return Promise.resolve(waitForInsert).then(() =>
      run("Dream", supabase.from("stars").update(patch).eq("id", id))
    );
  }

  function patchStar(id: string, patch: Partial<Star>, delay = 600) {
    setStars((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    patches.current.set(id, { ...patches.current.get(id), ...patch });
    window.clearTimeout(timers.current.get(id));
    if (delay === 0) flush(id);
    else timers.current.set(id, window.setTimeout(() => flush(id), delay));
  }

  // Best effort: send unsaved edits when the tab is hidden or closed.
  useEffect(() => {
    const flushAll = () => {
      for (const id of Array.from(patches.current.keys())) flush(id);
    };
    window.addEventListener("pagehide", flushAll);
    return () => window.removeEventListener("pagehide", flushAll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- create / delete ---------- */

  function addStar(x: number, y: number) {
    const star: Star = {
      id: crypto.randomUUID(),
      constellation_id: constellation.id,
      title: "", body: "", photo_path: null, spotify_track_id: null, x, y,
    };
    setStars((ss) => [...ss, star]);
    newStarId.current = star.id;
    const p = run("New dream", supabase.from("stars").insert(star)).then((ok) => {
      inserts.current.delete(star.id);
      if (!ok) setStars((ss) => ss.filter((s) => s.id !== star.id));
    });
    inserts.current.set(star.id, p);
    openEditor(star.id);
  }

  async function removeStar(id: string, quiet = false) {
    const star = starsRef.current.find((s) => s.id === id);
    window.clearTimeout(timers.current.get(id));
    patches.current.delete(id);
    setStars((ss) => ss.filter((s) => s.id !== id));
    setLinks((ls) => ls.filter((l) => l.from_star !== id && l.to_star !== id));
    await inserts.current.get(id);
    const ok = await run("Delete", supabase.from("stars").delete().eq("id", id));
    if (ok && star?.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([star.photo_path]);
    if (ok && !quiet) showToast("Dream deleted.");
  }

  /* ---------- editor sheet ---------- */

  function openEditor(id: string) {
    if (editingId && editingId !== id) closeEditor();
    const s = starsRef.current.find((x) => x.id === id);
    setSongInput(s?.spotify_track_id ? `https://open.spotify.com/track/${s.spotify_track_id}` : "");
    setShareOpen(false);
    setEditingId(id);
  }

  function closeEditor() {
    const id = editingId;
    setEditingId(null);
    if (!id) return;
    const s = starsRef.current.find((x) => x.id === id);
    if (s && newStarId.current === id && isEmpty(s)) removeStar(id, true);
    else flush(id);
    newStarId.current = null;
  }

  function onSongChange(value: string) {
    setSongInput(value);
    if (!editing) return;
    const trimmed = value.trim();
    if (!trimmed) patchStar(editing.id, { spotify_track_id: null }, 0);
    else {
      const id = spotifyTrackId(trimmed);
      if (id && id !== editing.spotify_track_id) patchStar(editing.id, { spotify_track_id: id }, 0);
    }
  }
  const songError = songInput.trim() !== "" && !spotifyTrackId(songInput.trim());

  async function onPhoto(file: File | undefined) {
    if (!file || !editing) return;
    const star = editing;
    try {
      const blob = await downscaleImage(file);
      const path = `${userId}/${star.id}-${Date.now()}.jpg`;
      await inserts.current.get(star.id);
      const ok = await run(
        "Photo",
        supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg" })
      );
      if (!ok) return;
      const old = star.photo_path;
      patchStar(star.id, { photo_path: path }, 0);
      if (old) supabase.storage.from(PHOTO_BUCKET).remove([old]);
    } catch {
      showToast("That file couldn't be opened as a photo. Try a JPG or PNG.");
    }
  }

  function removePhoto() {
    if (!editing?.photo_path) return;
    const old = editing.photo_path;
    patchStar(editing.id, { photo_path: null }, 0);
    supabase.storage.from(PHOTO_BUCKET).remove([old]);
  }

  /* ---------- connections ---------- */

  async function toggleLink(a: string, b: string) {
    const [from_star, to_star] = orderPair(a, b);
    const exists = links.some((l) => l.from_star === from_star && l.to_star === to_star);
    await Promise.all([inserts.current.get(a), inserts.current.get(b)]);
    if (exists) {
      setLinks((ls) => ls.filter((l) => !(l.from_star === from_star && l.to_star === to_star)));
      run("Line", supabase.from("connections").delete().eq("from_star", from_star).eq("to_star", to_star));
    } else {
      setLinks((ls) => [...ls, { from_star, to_star }]);
      const ok = await run(
        "Line",
        supabase.from("connections").insert({ constellation_id: constellation.id, from_star, to_star })
      );
      if (!ok) setLinks((ls) => ls.filter((l) => !(l.from_star === from_star && l.to_star === to_star)));
    }
  }

  function startConnect() {
    if (!editingId) return;
    const id = editingId;
    closeEditor();
    setConnectFrom(id);
  }

  /* ---------- name + publishing ---------- */

  function onNameChange(value: string) {
    setName(value);
    window.clearTimeout(nameTimer.current);
    nameTimer.current = window.setTimeout(() => {
      run("Name", supabase.from("constellations").update({ name: value.trim() }).eq("id", constellation.id));
    }, 700);
  }

  async function togglePublished() {
    const next = !published;
    const ok = await run(
      "Publish",
      supabase
        .from("constellations")
        .update({ is_published: next, published_at: next ? new Date().toISOString() : null })
        .eq("id", constellation.id)
    );
    if (ok) {
      setPublished(next);
      showToast(next ? "Published. Your constellation is now in the galaxy." : "Unpublished. Only you can see it now.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Link copied.");
    } catch {
      showToast("Copy didn't work here. Select the link and copy it manually.");
    }
  }

  /* ---------- pointer handling on the sky ---------- */

  function toNorm(e: { clientX: number; clientY: number }) {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: clamp((e.clientX - r.left) / r.width, 0.03, 0.97),
      y: clamp((e.clientY - r.top) / r.height, 0.1, 0.86),
    };
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    const g = (e.target as Element).closest<SVGGElement>(".star");
    press.current = { id: g?.dataset.id ?? null, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const p = press.current;
    if (!p?.id) return;
    if (!p.moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 6) return;
    p.moved = true;
    const { x, y } = toNorm(e);
    setStars((ss) => ss.map((s) => (s.id === p.id ? { ...s, x, y } : s)));
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    const p = press.current;
    press.current = null;
    if (!p) return;
    if (p.moved && p.id) {
      const s = starsRef.current.find((x) => x.id === p.id);
      if (s) patchStar(s.id, { x: s.x, y: s.y }, 0);
      return;
    }
    handleTap(p.id, e);
  }

  function handleTap(id: string | null, e?: { clientX: number; clientY: number }) {
    if (connectFrom) {
      if (!id) setConnectFrom(null);
      else if (id !== connectFrom) { toggleLink(connectFrom, id); setConnectFrom(id); }
      return;
    }
    if (id) { openEditor(id); return; }
    if (editingId) { closeEditor(); return; }
    if (shareOpen) { setShareOpen(false); return; }
    if (e) { const { x, y } = toNorm(e); addStar(x, y); }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (editingId) closeEditor();
      else if (shareOpen) setShareOpen(false);
      else if (connectFrom) setConnectFrom(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- render ---------- */

  const n = stars.length;
  const editingPhoto = photoUrl(editing?.photo_path ?? null);

  return (
    <div className="sky-shell" ref={shellRef}>
      <Starfield />
      <svg
        ref={svgRef}
        className="sky editable"
        viewBox={`0 0 ${w || 1} ${h || 1}`}
        role="application"
        aria-label="Your sky. Tap empty space to place a dream."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (press.current = null)}
        onKeyDown={(e) => {
          const g = (e.target as Element).closest<SVGGElement>(".star");
          if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); handleTap(g.dataset.id ?? null); }
        }}
      >
        <GlowDefs />
        {w > 0 && (
          <SkyLayer stars={stars} links={links} w={w} h={h} selectedId={editingId} sourceId={connectFrom} />
        )}
      </svg>

      <header className="topbar">
        <Link href="/" className="mark">Tala</Link>
        <input
          className="name-input"
          value={name}
          maxLength={48}
          placeholder="Name your constellation"
          aria-label="Constellation name"
          onChange={(e) => onNameChange(e.target.value)}
        />
        <span className="save-state" aria-live="polite">{pending > 0 ? "Saving…" : "Saved"}</span>
      </header>

      <div className="bar">
        {connectFrom ? (
          <>
            <p><strong>Tap another star</strong> to draw a line. Tap a connected pair again to erase it.</p>
            <button className="btn primary" onClick={() => setConnectFrom(null)}>Done</button>
          </>
        ) : (
          <>
            <p>
              {n === 0 ? (
                <><strong>Tap anywhere in the sky</strong> to place your first dream.</>
              ) : (
                <><strong>{n} {n === 1 ? "dream" : "dreams"}.</strong> Tap a star to open it, drag to move it.</>
              )}
            </p>
            <button className="btn primary" onClick={() => { closeEditor(); setShareOpen(true); }}>
              {published ? "Share" : "Publish"}
            </button>
          </>
        )}
      </div>

      {/* Dream editor */}
      <aside className={`sheet${editing ? " open" : ""}`} aria-label="Edit dream" aria-hidden={!editing}>
        {editing && (
          <>
            <div className="sheet-head">
              <span>{newStarId.current === editing.id ? "New dream" : "Dream"}</span>
              <button className="close" onClick={closeEditor} aria-label="Close">×</button>
            </div>
            <input
              className="dream-title"
              value={editing.title}
              maxLength={60}
              placeholder="Name this dream"
              aria-label="Dream title"
              onChange={(e) => patchStar(editing.id, { title: e.target.value })}
            />
            <textarea
              value={editing.body}
              maxLength={1000}
              placeholder="What does it look like when it comes true?"
              aria-label="Dream description"
              onChange={(e) => patchStar(editing.id, { body: e.target.value })}
            />

            <span className="field-label">Photo</span>
            {editingPhoto && <img className="photo" src={editingPhoto} alt="" />}
            <div className="row">
              <label className="btn file-btn">
                {editingPhoto ? "Replace photo" : "Add a photo"}
                <input type="file" accept="image/*" onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {editingPhoto && <button className="btn" onClick={removePhoto}>Remove photo</button>}
            </div>

            <span className="field-label">Song</span>
            <input
              className="text-field"
              value={songInput}
              inputMode="url"
              placeholder="Paste a Spotify song link"
              aria-label="Spotify song link"
              onChange={(e) => onSongChange(e.target.value)}
            />
            {songError && (
              <div className="err">That isn&apos;t a Spotify song link. In Spotify, tap Share, then Copy song link.</div>
            )}
            {editing.spotify_track_id && <SpotifyEmbed trackId={editing.spotify_track_id} />}

            <div className="actions">
              <button className="btn" onClick={startConnect}>Connect to another dream</button>
              <span className="spacer" />
              <button className="btn danger" onClick={() => { const id = editing.id; setEditingId(null); newStarId.current = null; removeStar(id); }}>
                Delete
              </button>
              <button className="btn primary" onClick={closeEditor}>Done</button>
            </div>
          </>
        )}
      </aside>

      {/* Share + publish */}
      <aside className={`sheet${shareOpen ? " open" : ""}`} aria-label="Share" aria-hidden={!shareOpen}>
        <div className="sheet-head">
          <span>{published ? "Published" : "Not published yet"}</span>
          <button className="close" onClick={() => setShareOpen(false)} aria-label="Close">×</button>
        </div>
        <h2 className="card-title">{published ? "Your constellation is in the galaxy" : "Share your constellation"}</h2>
        <p className="card-body">
          {published
            ? "Anyone with the link can see it, and it appears in the shared galaxy."
            : "Only you can see it right now. Publish to get a link and add it to the shared galaxy."}
        </p>
        {published && (
          <div className="share-box">
            <input className="text-field" readOnly value={shareUrl} aria-label="Share link" onFocus={(e) => e.target.select()} />
            <button className="btn primary" onClick={copyLink}>Copy link</button>
          </div>
        )}
        <div className="actions">
          <button className={`btn${published ? "" : " primary"}`} onClick={togglePublished} disabled={n === 0}>
            {published ? "Unpublish" : "Publish"}
          </button>
          <Link className="btn" href={`/c/${constellation.slug}`}>View shared page</Link>
          <Link className="btn" href="/galaxy">Open galaxy</Link>
          <span className="spacer" />
          <form action="/auth/signout" method="post">
            <button className="btn" type="submit">Sign out</button>
          </form>
        </div>
        {n === 0 && <p className="hint">Add at least one dream before publishing.</p>}
      </aside>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
