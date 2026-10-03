import type { Star } from "@/lib/types";
import { photoUrl } from "@/lib/dreams";
import SpotifyEmbed from "./SpotifyEmbed";

/** Read-only view of one dream, used on shared pages. */
export default function DreamCard({ star }: { star: Star }) {
  const src = photoUrl(star.photo_path);
  return (
    <>
      {src && <img className="photo" src={src} alt="" />}
      <h2 className="card-title">{star.title || "Untitled dream"}</h2>
      {star.body && <p className="card-body">{star.body}</p>}
      {star.spotify_track_id && <SpotifyEmbed trackId={star.spotify_track_id} />}
    </>
  );
}
