export default function SpotifyEmbed({ trackId }: { trackId: string }) {
  return (
    <iframe
      className="spotify"
      title="Song for this dream"
      src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
      height={80}
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    />
  );
}
