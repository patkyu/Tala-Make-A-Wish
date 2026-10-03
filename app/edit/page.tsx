import { redirect } from "next/navigation";
import Editor from "@/components/Editor";
import { createClient } from "@/lib/supabase/server";
import { randomSlug } from "@/lib/dreams";
import type { Constellation, Link, Star } from "@/lib/types";

export const metadata = { title: "Your constellation · Tala" };

const CONSTELLATION_COLS = "id, owner_id, name, slug, is_published, published_at";

export default async function EditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // One constellation per person: load it, or create it on first visit.
  let { data: constellation } = await supabase
    .from("constellations")
    .select(CONSTELLATION_COLS)
    .eq("owner_id", user.id)
    .maybeSingle<Constellation>();

  for (let attempt = 0; !constellation && attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("constellations")
      .insert({ owner_id: user.id, slug: randomSlug() })
      .select(CONSTELLATION_COLS)
      .single<Constellation>();
    if (data) constellation = data;
    else if (error?.code === "23505") {
      // Unique clash: either the slug was taken or another tab created it first.
      const again = await supabase.from("constellations").select(CONSTELLATION_COLS)
        .eq("owner_id", user.id).maybeSingle<Constellation>();
      constellation = again.data;
    } else if (error) throw new Error(error.message);
  }
  if (!constellation) throw new Error("Could not create your constellation.");

  const [stars, links] = await Promise.all([
    supabase.from("stars")
      .select("id, constellation_id, title, body, photo_path, spotify_track_id, x, y")
      .eq("constellation_id", constellation.id)
      .order("created_at"),
    supabase.from("connections").select("from_star, to_star").eq("constellation_id", constellation.id),
  ]);

  return (
    <Editor
      constellation={constellation}
      initialStars={(stars.data ?? []) as Star[]}
      initialLinks={(links.data ?? []) as Link[]}
      userId={user.id}
    />
  );
}
