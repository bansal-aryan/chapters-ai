import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Home,
  Mail,
  MessageSquare,
  Play,
  Search,
  Settings,
  Sparkles,
  Target,
  Trophy
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LandingPageProps = {
  isAuthenticated: boolean;
};

const navItems = [
  { label: "Features", href: "/features" },
  { label: "How it Works", href: "/how-it-works" },
  { label: "For Schools", href: "/schools" },
  { label: "Pricing", href: "/pricing" }
];

const featureItems = [
  { icon: Sparkles, label: "AI Prioritization" },
  { icon: CalendarDays, label: "Smart Calendar" },
  { icon: Target, label: "Focus Modes" },
  { icon: MessageSquare, label: "AI Assistant" },
  { icon: BarChart3, label: "Progress Insights" }
];

const priorities = [
  { title: "AP Calculus BC", body: "Problem Set", due: "Due in 2 days", level: "High" },
  { title: "DECA Pitch Practice", body: "Review outline", due: "Due in 3 days", level: "Medium" },
  { title: "Robotics Build Session", body: "Today, 4:00 PM", due: "Club lab", level: "Low" }
];

const schedule = [
  ["8:00 AM", "AP Statistics"],
  ["10:00 AM", "AP Calculus BC"],
  ["12:00 PM", "Lunch"],
  ["1:00 PM", "Physics"],
  ["4:00 PM", "Robotics Club"]
];

export function LandingPage({ isAuthenticated }: LandingPageProps) {
  const primaryHref = isAuthenticated ? "/dashboard" : "/signup";
  const primaryLabel = isAuthenticated ? "Open App" : "Get Started";

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <MarketingNav isAuthenticated={isAuthenticated} />

      <section className="mx-auto grid min-h-[calc(100vh-96px)] max-w-[1440px] items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:px-12 lg:pb-24">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-4 text-brand" />
            AI operating system for students
          </div>

          <h1 className="mt-10 text-balance text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
            Your day.
            <br />
            Organized.
            <br />
            <span className="bg-gradient-to-r from-brand to-violet-500 bg-clip-text text-transparent">
              Intelligently.
            </span>
          </h1>

          <p className="mt-8 max-w-md text-lg leading-8 text-muted-foreground">
            Chapters adapts to your classes, goals, and schedule so you can focus on what matters.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button asChild className="h-14 px-6 shadow-[0_16px_34px_rgba(15,15,15,0.2)]" size="lg">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild className="h-14 px-5" size="lg" variant="ghost">
              <Link href="/features">
                See it in action
                <span className="flex size-6 items-center justify-center rounded-full border border-foreground/30">
                  <Play className="ml-0.5 size-3 fill-current" />
                </span>
              </Link>
            </Button>
          </div>
        </div>

        <HeroDashboardPreview />
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12" id="features">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Everything you need. In one place.
        </h2>
        <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {featureItems.map((item) => {
            const Icon = item.icon;

            return (
              <div className="flex flex-col items-center text-center" key={item.label}>
                <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-brand shadow-sm">
                  <Icon className="size-8" />
                </div>
                <p className="mt-5 text-sm font-semibold">{item.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12" id="how-it-works">
        <div className="grid overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-panel lg:grid-cols-[0.82fr_1.18fr]">
          <div className="p-8 sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Adaptive experience</p>
            <h2 className="mt-5 max-w-sm text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              One workspace. Endless possibilities.
            </h2>
            <div className="mt-8 h-px w-16 bg-foreground/25" />
            <p className="mt-8 max-w-sm text-sm leading-7 text-muted-foreground">
              Your dashboard adapts to what you need, when you need it. Classes, exams, clubs, and college applications all get the right mode.
            </p>
            <Button asChild className="mt-8 px-0 text-brand hover:text-brand" variant="ghost">
              <Link href="/features">
                Explore Features
                <ArrowRight />
              </Link>
            </Button>
          </div>

          <AdaptivePreview />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-6 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:px-12" id="schools">
        <div className="rounded-[2rem] border border-border/70 bg-card p-8 shadow-sm">
          <GraduationCap className="size-8 text-brand" />
          <h2 className="mt-8 text-3xl font-semibold tracking-tight">For ambitious students and the schools that support them.</h2>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            Chapters helps students keep agency while giving schools a calmer support layer around deadlines, materials, and study planning.
          </p>
        </div>
        <div className="rounded-[2rem] border border-border/70 bg-card p-8 shadow-sm" id="pricing">
          <Trophy className="size-8 text-brand" />
          <h2 className="mt-8 text-3xl font-semibold tracking-tight">Built for an early MVP, priced for access.</h2>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            Start with the student workspace, then expand into school partnerships as Canvas sync, insights, and guardian workflows mature.
          </p>
          <Button asChild className="mt-8">
            <Link href={primaryHref}>
              {primaryLabel}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-12">
        <div>
          <BrandMark />
          <p className="mt-4 text-sm text-muted-foreground">AI for student success.</p>
        </div>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link className="transition-colors hover:text-foreground" href="/login">
            Sign in
          </Link>
          <Link className="transition-colors hover:text-foreground" href="mailto:hello@chapters.ai" aria-label="Email chapters">
            <Mail className="size-5" />
          </Link>
        </div>
      </footer>
    </main>
  );
}

export function MarketingNav({ isAuthenticated }: LandingPageProps) {
  return (
    <header className="relative z-40">
      <div className="mx-auto flex h-24 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
          aria-label="chapters home"
        >
          <BrandMark />
        </Link>
        <nav className="hidden items-center gap-10 text-sm font-medium text-foreground md:flex">
          {navItems.map((item) => (
            <Link className="transition-colors hover:text-brand" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Button asChild className="h-11 px-5">
          <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
            {isAuthenticated ? "Open App" : "Get Started"}
          </Link>
        </Button>
      </div>
    </header>
  );
}

export function BrandMark() {
  return (
    <span className="inline-flex items-baseline text-3xl font-semibold tracking-tight">
      chapters
      <span className="text-brand">.</span>
    </span>
  );
}

function HeroDashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[740px]">
      <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-brand/10 via-transparent to-transparent blur-3xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-panel">
        <div className="grid min-h-[560px] grid-cols-[76px_minmax(0,1fr)]">
          <MockSidebar />
          <div className="p-6 sm:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Good morning, Alex</h2>
                <p className="mt-2 text-sm text-muted-foreground">Here is your plan for today.</p>
              </div>
              <div className="flex items-center gap-3">
                <Search className="size-5" />
                <Bell className="size-5" />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
              <PriorityCard />
              <FocusCard />
              <ScheduleCard />
              <InsightCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockSidebar() {
  const items = [Home, CalendarDays, ClipboardList, Target, MessageSquare, Settings];

  return (
    <aside className="flex flex-col items-center justify-between border-r border-border/70 bg-card py-8">
      <div className="flex flex-col items-center gap-5">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-muted text-brand">
          <Sparkles className="size-5 fill-brand/20" />
        </div>
        <nav className="flex flex-col gap-3" aria-label="Preview navigation">
          {items.map((Icon, index) => (
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-2xl text-muted-foreground",
                index === 0 && "bg-brand-muted text-brand"
              )}
              key={index}
            >
              <Icon className="size-5" />
            </div>
          ))}
        </nav>
      </div>
      <div className="relative">
        <div className="flex size-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">A</div>
        <span className="absolute bottom-0 right-0 size-2.5 rounded-full border border-white bg-emerald-500" />
      </div>
    </aside>
  );
}

function PriorityCard() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <p className="text-sm font-semibold">Top Priorities</p>
      <div className="mt-5 space-y-5">
        {priorities.map((item) => (
          <div className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-3" key={item.title}>
            <span className="mt-1 size-3 rounded-full border border-border" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-brand-muted px-2 py-1 text-xs font-semibold text-brand">{item.level}</span>
              <p className="mt-2 text-[11px] text-muted-foreground">{item.due}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FocusCard() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <p className="text-sm font-semibold">Focus Mode</p>
      <div className="mt-6">
        <p className="text-sm font-semibold">AP Stats Exam</p>
        <p className="mt-1 text-xs text-muted-foreground">in 3 days</p>
      </div>
      <div className="mt-6 flex justify-center">
        <div className="grid size-28 place-items-center rounded-full border-[10px] border-brand border-l-brand/20">
          <div className="text-center">
            <p className="text-lg font-semibold">72%</p>
            <p className="text-[11px] text-muted-foreground">Prepared</p>
          </div>
        </div>
      </div>
      <Button className="mt-6 w-full">Start Focus</Button>
    </div>
  );
}

function ScheduleCard() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <p className="text-sm font-semibold">Today&apos;s Schedule</p>
      <div className="mt-5 space-y-3">
        {schedule.map(([time, label]) => (
          <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 text-sm" key={`${time}-${label}`}>
            <p className="text-muted-foreground">{time}</p>
            <p className="font-medium">{label}</p>
          </div>
        ))}
      </div>
      <Button asChild className="mt-6 px-0 text-brand hover:text-brand" variant="ghost">
        <Link href="/calendar">
          View full calendar
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

function InsightCard() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-brand" />
        <p className="text-sm font-semibold">AI Insight</p>
      </div>
      <p className="mt-8 text-sm leading-7">
        You have 3 high priority tasks due this week. Want me to build a study plan?
      </p>
      <Button asChild className="mt-8 px-0 text-brand hover:text-brand" variant="ghost">
        <Link href="/assistant">
          Generate Plan
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

function AdaptivePreview() {
  const modes = [
    {
      title: "Exam Mode",
      subtitle: "AP Calculus BC",
      tasks: [
        ["Review Notes", "30 min"],
        ["Practice Problems", "60 min"],
        ["Past FRQs", "45 min"],
        ["Summary Sheet", "15 min"]
      ],
      primary: true
    },
    {
      title: "Project Mode",
      subtitle: "Robotics Competition",
      tasks: [
        ["Build Arm", ""],
        ["Test Sensors", ""],
        ["Optimize Code", ""],
        ["Practice Runs", ""]
      ]
    },
    {
      title: "Application Mode",
      subtitle: "College Apps",
      tasks: [
        ["Common App", ""],
        ["Supplements", ""],
        ["Essays", ""],
        ["Recommendations", ""]
      ]
    }
  ];

  return (
    <div className="relative min-h-[520px] overflow-hidden bg-gradient-to-br from-muted via-background to-muted p-6 sm:p-10">
      <div className="absolute right-8 top-8 hidden h-24 w-24 rounded-full border border-brand/30 sm:block" />
      <div className="relative grid gap-5 lg:grid-cols-[1.2fr_0.74fr_0.74fr] lg:items-end">
        {modes.map((mode) => (
          <div
            className={cn(
              "rounded-2xl border border-border/80 bg-card p-5 shadow-soft",
              mode.primary ? "min-h-[390px]" : "min-h-[320px] lg:translate-y-8"
            )}
            key={mode.title}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{mode.title}</h3>
                <p className="mt-3 text-xs text-muted-foreground">{mode.subtitle}</p>
              </div>
              {mode.primary ? <Sparkles className="size-8 text-brand" /> : <Bot className="size-9 text-muted-foreground" />}
            </div>
            <p className="mt-6 text-xs font-semibold">Study Plan</p>
            <div className="mt-4 space-y-4">
              {mode.tasks.map(([task, time]) => (
                <div className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 text-sm" key={task}>
                  <span className="size-3 rounded-full border border-border" />
                  <span>{task}</span>
                  <span className="text-xs text-muted-foreground">{time}</span>
                </div>
              ))}
            </div>
            <Button className={cn("mt-8 w-full", mode.primary && "bg-brand text-brand-foreground hover:bg-brand/90")}>
              {mode.primary ? "Start Session" : mode.title === "Project Mode" ? "View Tasks" : "View Progress"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
