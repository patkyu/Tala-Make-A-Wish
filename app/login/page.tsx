import Starfield from "@/components/Starfield";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Tala" };

export default function LoginPage() {
  return (
    <main className="sky-shell">
      <Starfield />
      <div className="center">
        <LoginForm />
      </div>
    </main>
  );
}
