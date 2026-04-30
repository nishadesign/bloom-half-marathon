import { redirect } from "next/navigation";
import Logo from "../components/Logo";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="min-h-screen text-obsidian">
      <div className="mx-auto max-w-[560px] px-sm sm:px-md md:px-xl py-xl sm:py-2xl">
        <nav className="flex items-center gap-sm mb-lg rise stagger-1">
          <Logo />
          <span className="display text-[22px] sm:text-[26px] tracking-[-0.015em]">
            Half Marathon
          </span>
        </nav>

        <section className="card p-md sm:p-lg rise stagger-2">
          <p className="eyebrow mb-xs text-[14px]">Sign in</p>
          <h1 className="display text-[28px] sm:text-[36px] tracking-[-0.02em] leading-[1.1] mb-md">
            Connect your Strava to begin.
          </h1>
          <p className="display-italic text-[15px] text-graphite mb-lg">
            We use your Strava athlete ID as your login. If you're new, we'll
            finish setup on the next screen.
          </p>
          <div className="flex flex-col sm:flex-row gap-sm sm:items-center">
            <a href="/api/strava/connect" className="btn-primary inline-block">
              Connect Strava
            </a>
            <a
              href="/onboarding"
              className="display-italic text-[14px] text-sand-deep hover:text-ink transition-colors"
            >
              Continue without Strava →
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
