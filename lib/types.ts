export type Star = {
  id: string;
  constellation_id: string;
  title: string;
  body: string;
  photo_path: string | null;
  spotify_track_id: string | null;
  x: number;
  y: number;
};

export type Link = { from_star: string; to_star: string };

export type Constellation = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  is_published: boolean;
  published_at: string | null;
};

export type GalaxyConstellation = {
  id: string;
  name: string;
  slug: string;
  stars: Star[];
  connections: Link[];
};
