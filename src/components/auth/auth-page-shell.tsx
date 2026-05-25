import { Sparkles } from "lucide-react";
import Link from "next/link";

type AuthPageShellProps = {
  children: React.ReactNode;
  heading: string;
  subheading: string;
};

export function AuthPageShell({ children, heading, subheading }: AuthPageShellProps) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
        <header className="flex h-14 items-center justify-between">
          <Link className="flex items-center gap-3" href="/">
            <span className="text-2xl font-semibold tracking-tight">
              chapters<span className="text-brand">.</span>
            </span>
          </Link>
          <Link className="text-sm text-muted-foreground transition-colors hover:text-foreground" href="/">
            Back to home
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_460px]">
          <div className="max-w-xl">
            <div className="mb-7 flex size-12 items-center justify-center rounded-2xl border border-brand/10 bg-brand-muted text-brand">
              <Sparkles className="size-5" />
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">{heading}</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">{subheading}</p>
            <div className="mt-10 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              {["Canvas-aware", "AI prioritized", "Built for focus"].map((item) => (
                <div className="rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-sm" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="w-full">{children}</div>
        </section>
      </div>
    </main>
  );
}
