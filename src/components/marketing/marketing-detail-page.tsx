import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  GraduationCap,
  LockKeyhole,
  MessageSquare,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Users
} from "lucide-react";
import Link from "next/link";
import { BrandMark, MarketingNav } from "@/components/marketing/landing-page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MarketingPageKind = "features" | "how-it-works" | "schools" | "pricing";

type MarketingDetailPageProps = {
  isAuthenticated: boolean;
  kind: MarketingPageKind;
};

const pageContent = {
  features: {
    eyebrow: "Features",
    title: "Everything school asks for, organized into one intelligent workspace.",
    body: "Chapters combines priority planning, course material search, focus blocks, and guided AI help so students always know what matters next.",
    icon: Sparkles,
    primaryHref: "/signup",
    primaryLabel: "Get Started",
    cards: [
      {
        icon: Sparkles,
        title: "AI prioritization",
        body: "Assignments are ranked by missing status, due date, and estimated effort so the next action is obvious."
      },
      {
        icon: CalendarDays,
        title: "Smart calendar",
        body: "Study time is auto-blocked around fixed events, deadlines, workload, and how each student works best."
      },
      {
        icon: FileSearch,
        title: "Course material search",
        body: "Search PDFs, docs, images, modules, assignments, and related past work from one place."
      },
      {
        icon: MessageSquare,
        title: "AI assistant",
        body: "Students can ask for explanations, share their work, and get guided feedback with citations."
      }
    ]
  },
  "how-it-works": {
    eyebrow: "How it works",
    title: "Connect school context. Get a plan. Study with guidance.",
    body: "Chapters is built around the student workflow: import the mess, understand the week, protect focus time, and learn from course material.",
    icon: ClipboardList,
    primaryHref: "/signup",
    primaryLabel: "Start onboarding",
    cards: [
      {
        icon: BookOpen,
        title: "1. Connect Canvas",
        body: "Students enter their Canvas domain and sign in through a secure OAuth-ready flow."
      },
      {
        icon: Target,
        title: "2. Build the priority queue",
        body: "Assignments, files, modules, due dates, and manual tasks become one ranked workspace."
      },
      {
        icon: Timer,
        title: "3. Block focus time",
        body: "The schedule becomes aggressive but doable by estimating effort and respecting protected events."
      },
      {
        icon: CheckCircle2,
        title: "4. Learn with support",
        body: "The assistant explains, checks attempts, and points students back to relevant materials."
      }
    ]
  },
  schools: {
    eyebrow: "For schools",
    title: "A calmer support layer for ambitious students.",
    body: "Chapters helps students stay self-directed while giving schools a modern way to support workload clarity, executive function, and study planning.",
    icon: GraduationCap,
    primaryHref: "/signup",
    primaryLabel: "Join the pilot",
    cards: [
      {
        icon: Users,
        title: "Student agency first",
        body: "The product guides students toward the work instead of replacing learning or completing assignments."
      },
      {
        icon: Building2,
        title: "Canvas-aware",
        body: "Designed around real school systems: assignments, due dates, modules, files, and course structure."
      },
      {
        icon: BarChart3,
        title: "Workload visibility",
        body: "Students can see risk, focus coverage, upcoming deadlines, and course material gaps."
      },
      {
        icon: LockKeyhole,
        title: "Responsible AI posture",
        body: "Guidance-first AI explains, checks, cites, and nudges students toward their own answer."
      }
    ]
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Simple pricing for a student-first product.",
    body: "Start with an individual workspace, then expand into school partnerships as Canvas sync and insights mature.",
    icon: Trophy,
    primaryHref: "/signup",
    primaryLabel: "Get Started",
    cards: [
      {
        icon: Sparkles,
        title: "Student",
        body: "A focused workspace for priority planning, materials search, focus mode, and AI guidance."
      },
      {
        icon: GraduationCap,
        title: "School pilot",
        body: "Early partner access for schools that want to test student workload support with real feedback."
      },
      {
        icon: Building2,
        title: "Institution",
        body: "Future team controls, reporting, onboarding support, and deeper Canvas deployment workflows."
      },
      {
        icon: MessageSquare,
        title: "Feedback program",
        body: "Founding users help shape pricing, integrations, and the student safety model."
      }
    ]
  }
} satisfies Record<MarketingPageKind, {
  body: string;
  cards: Array<{
    body: string;
    icon: typeof Sparkles;
    title: string;
  }>;
  eyebrow: string;
  icon: typeof Sparkles;
  primaryHref: string;
  primaryLabel: string;
  title: string;
}>;

export function MarketingDetailPage({ isAuthenticated, kind }: MarketingDetailPageProps) {
  const content = pageContent[kind];
  const Icon = content.icon;
  const primaryHref = isAuthenticated ? "/dashboard" : content.primaryHref;
  const primaryLabel = isAuthenticated ? "Open App" : content.primaryLabel;

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <MarketingNav isAuthenticated={isAuthenticated} />

      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-12 lg:py-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
            <Icon className="size-4 text-brand" />
            {content.eyebrow}
          </div>
          <h1 className="mt-8 max-w-3xl text-balance text-5xl font-semibold leading-[1] tracking-tight sm:text-6xl">
            {content.title}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">{content.body}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 px-6">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild className="h-12 px-6" variant="secondary">
              <Link href="/">Back home</Link>
            </Button>
          </div>
        </div>

        <DetailPreview kind={kind} />
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-5 px-5 pb-20 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-12">
        {content.cards.map((card) => {
          const CardIcon = card.icon;

          return (
            <article className="rounded-[1.5rem] border border-border/70 bg-card p-6 shadow-sm" key={card.title}>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-muted text-brand">
                <CardIcon className="size-6" />
              </div>
              <h2 className="mt-7 text-lg font-semibold tracking-tight">{card.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.body}</p>
            </article>
          );
        })}
      </section>

      <footer className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-12">
        <div>
          <BrandMark />
          <p className="mt-4 text-sm text-muted-foreground">AI for student success.</p>
        </div>
        <Button asChild variant="secondary">
          <Link href={primaryHref}>
            {primaryLabel}
            <ArrowRight />
          </Link>
        </Button>
      </footer>
    </main>
  );
}

function DetailPreview({ kind }: { kind: MarketingPageKind }) {
  const rows = {
    features: ["Priority queue", "Materials search", "Focus mode", "AI feedback"],
    "how-it-works": ["Connect Canvas", "Review plan", "Block study time", "Ask for guidance"],
    schools: ["Student ownership", "Course context", "Responsible AI", "Workload clarity"],
    pricing: ["Student workspace", "School pilot", "Institution", "Feedback program"]
  }[kind];

  return (
    <div className="relative">
      <div className="absolute -inset-8 rounded-[3rem] bg-brand/10 blur-3xl" />
      <div className="relative rounded-[2rem] border border-border/70 bg-card p-5 shadow-panel sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">chapters workspace</p>
            <p className="mt-1 text-xs text-muted-foreground">Organized intelligently</p>
          </div>
          <Sparkles className="size-5 text-brand" />
        </div>
        <div className="mt-7 grid gap-3">
          {rows.map((row, index) => (
            <div
              className={cn(
                "grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background p-4",
                index === 0 && "border-brand/20 bg-brand-muted/60"
              )}
              key={row}
            >
              <div className="flex size-9 items-center justify-center rounded-2xl bg-card text-sm font-semibold text-brand">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-semibold">{row}</p>
                <p className="mt-1 text-xs text-muted-foreground">Ready for the next step</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
