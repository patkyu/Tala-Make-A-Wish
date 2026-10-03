import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Viewer from "@/components/Viewer";
import { createClient } from "@/lib/supabase/server";
import type { Link, Star } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

// RLS decides visibility: published constellations for everyone, drafts only for the owner.
const getConstellation = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("constellations")
    .select("id, owner_id, name, slug, is_published")
    .eq("slug", slug)
    .maybeSingle();
  if (!c) return null;

  const [{ data: { user } }, stars, links] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("stars")
      .select("id, constellation_id, title, body, photo_path, spotify_track_id, x, y")
      .eq("constellation_id", c.id)
      .order("created_at"),
    supabase.from("connections").select("from_star, to_star").eq("constellation_id", c.id),
  ]);

  return {
    c,
    isOwner: user?.id === c.owner_id,
    stars: (stars.data ?? []) as Star[],
    links: (links.data ?? []) as Link[],
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getConstellation(slug);
  if (!data) return { title: "Constellation not found · Tala" };
  const title = `${data.c.name || "Untitled constellation"} · Tala`;
  const description = `A constellation of ${data.stars.length} dreams. Tap each star to read them.`;
  return { title, description, openGraph: { title, description } };
}

export default async function ConstellationPage({ params }: Props) {
  const { slug } = await params;
  const data = await getConstellation(slug);
  if (!data) notFound();

  return (
    <Viewer
      name={data.c.name}
      stars={data.stars}
      links={data.links}
      isOwner={data.isOwner}
      isPublished={data.c.is_published}
    />
  );
}
