import Starfield from "@/components/Starfield";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Tala" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="sky-shell">
      <Starfield />
      <div className="center">
        <LoginForm linkError={error === "link"} />
      </div>
    </main>
  );
}
