import Galaxy from "@/components/Galaxy";
import { createClient } from "@/lib/supabase/server";
import type { GalaxyConstellation } from "@/lib/types";

export const metadata = { title: "The galaxy · Tala" };

export default async function GalaxyPage() {
  const supabase = await createClient();
  // Oldest constellations sit at the center; newer ones spiral outward.
  const { data } = await supabase
    .from("constellations")
    .select(
      "id, name, slug, stars(id, constellation_id, title, body, photo_path, spotify_track_id, x, y), connections(from_star, to_star)"
    )
    .eq("is_published", true)
    .order("published_at", { ascending: true })
    .limit(200);

  return <Galaxy constellations={(data ?? []) as GalaxyConstellation[]} />;
}
