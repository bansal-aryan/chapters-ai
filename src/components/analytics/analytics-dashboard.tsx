import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Sparkles,
  Target,
  Timer
} from "lucide-react";
import Link from "next/link";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  buildAnalyticsSnapshot,
  type AnalyticsCourseHealth,
  type AnalyticsInput,
  type AnalyticsMaterialCoverage,
  type AnalyticsRecommendation,
  type AnalyticsRiskLevel,
  type AnalyticsSnapshot,
  type AnalyticsWorkloadDay
} from "@/lib/domain/analytics";
import { formatDateTime } from "@/lib/domain/format";
import { formatEffort } from "@/lib/domain/prioritization";
import { cn } from "@/lib/utils";

type AnalyticsDashboardProps = AnalyticsInput;

export function AnalyticsDashboard(props: AnalyticsDashboardProps) {
  const snapshot = buildAnalyticsSnapshot(props);

  if (!snapshot.totals.assignments && !snapshot.totals.courses) {
    return <AnalyticsEmptyState />;
  }

  const completionRate = snapshot.totals.assignments
    ? Math.round((snapshot.totals.completedAssignments / snapshot.totals.assignments) * 100)
    : 0;
  const topCourse = snapshot.courseHealth[0];
  const primaryRecommendation = snapshot.recommendations[0];

  return (
    <main className="mx-auto grid max-w-7xl gap-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge variant="secondary">
                <BarChart3 className="size-3" />
                Analytics workspace
              </Badge>
              <h1 className="mt-5 max-w-3xl text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
                Understand the week before it gets loud.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                chapters.ai turns assignments, study blocks, materials, and calendar context into a clear read on workload risk.
              </p>
            </div>
            <Badge className="w-fit" variant={getRiskBadgeVariant(snapshot.risk.level)}>
              {snapshot.risk.level} risk
            </Badge>
          </div>

          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            <InsightPill
              icon={Target}
              label="Recommended next action"
              value={primaryRecommendation?.title ?? "Keep working the plan"}
              href={primaryRecommendation?.href ?? "/focus"}
            />
            <InsightPill
              icon={BookOpen}
              label="Highest-risk course"
              value={topCourse ? topCourse.name : "Course data pending"}
              href={topCourse ? `/classes/${topCourse.id}` : "/dashboard"}
            />
            <InsightPill
              icon={Clock3}
              label="Open workload"
              value={formatEffort(snapshot.totals.effortMinutes)}
              href="/calendar"
            />
          </div>
        </div>

        <RiskStatusCard snapshot={snapshot} />
      </section>

      <section aria-label="Analytics summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          detail={`${snapshot.totals.openAssignments} open assignments`}
          icon={Clock3}
          label="Open workload"
          progress={Math.min(100, snapshot.totals.effortMinutes / 6)}
          value={formatEffort(snapshot.totals.effortMinutes)}
        />
        <KpiCard
          detail={`${snapshot.totals.overdueAssignments} overdue or missing`}
          icon={CalendarDays}
          label="Due this week"
          progress={snapshot.totals.openAssignments ? (snapshot.totals.dueSoonAssignments / snapshot.totals.openAssignments) * 100 : 0}
          value={snapshot.totals.dueSoonAssignments.toString()}
        />
        <KpiCard
          detail={`${snapshot.totals.completedAssignments} of ${snapshot.totals.assignments} submitted`}
          icon={CheckCircle2}
          label="Completion"
          progress={completionRate}
          value={`${completionRate}%`}
        />
        <KpiCard
          detail={`${snapshot.totals.courses} active courses`}
          icon={FileText}
          label="Indexed materials"
          progress={snapshot.totals.courses ? Math.min(100, (snapshot.totals.files / snapshot.totals.courses) * 35) : 0}
          value={snapshot.totals.files.toString()}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="grid gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <RiskScoreCard snapshot={snapshot} />
            <WorkloadTimeline workload={snapshot.workload} />
          </div>
          <CourseHealthTable rows={snapshot.courseHealth} />
        </div>

        <aside className="grid gap-6 self-start">
          <AIInsightPanel recommendations={snapshot.recommendations} />
          <FocusEffectivenessCard snapshot={snapshot} />
          <MaterialCoverageCard rows={snapshot.materialCoverage} missingFiles={snapshot.partial.missingFiles} />
        </aside>
      </section>
    </main>
  );
}

function RiskStatusCard({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Live risk score</p>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-5xl font-semibold tracking-tight">{snapshot.risk.score}</p>
            <p className="pb-2 text-sm text-muted-foreground">/100</p>
          </div>
        </div>
        <div className={cn("flex size-11 items-center justify-center rounded-2xl", getRiskIconClass(snapshot.risk.level))}>
          {snapshot.risk.level === "Low" ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
        </div>
      </div>
      <Progress aria-label="Live risk score" className="mt-5" value={snapshot.risk.score} />
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{snapshot.risk.summary}</p>
      {snapshot.topRiskAssignment ? (
        <Button asChild className="mt-5 w-full" variant="secondary">
          <Link href={`/assignments/${snapshot.topRiskAssignment.assignment.id}`}>
            Open highest-risk task
            <ArrowRight />
          </Link>
        </Button>
      ) : null}
    </Card>
  );
}

function KpiCard({
  detail,
  icon: Icon,
  label,
  progress,
  value
}: {
  detail: string;
  icon: typeof Clock3;
  label: string;
  progress: number;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
      </div>
      <Progress aria-label={`${label} progress`} className="mt-4" value={progress} />
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{detail}</p>
    </Card>
  );
}

function InsightPill({
  href,
  icon: Icon,
  label,
  value
}: {
  href: string;
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <Link
      className="group flex min-h-24 items-start gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={href}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-foreground">{value}</p>
      </div>
      <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function RiskScoreCard({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const drivers = [
    { label: "Missing", value: snapshot.totals.missingAssignments },
    { label: "Overdue", value: snapshot.totals.overdueAssignments },
    { label: "Due soon", value: snapshot.totals.dueSoonAssignments },
    { label: "Unscheduled", value: snapshot.focus.scheduleCoverage < 50 ? 1 : 0 }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Risk drivers</CardTitle>
            <CardDescription>Readable signals behind the score, not a black box.</CardDescription>
          </div>
          <Badge variant={getRiskBadgeVariant(snapshot.risk.level)}>{snapshot.risk.level}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {snapshot.topRiskAssignment ? (
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Highest-risk task</p>
            <h3 className="mt-2 line-clamp-2 text-sm font-semibold">{snapshot.topRiskAssignment.assignment.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {snapshot.topRiskAssignment.courseName} / {formatDateTime(snapshot.topRiskAssignment.assignment.dueDate)}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{snapshot.topRiskAssignment.reason}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm font-medium">No open risk detected</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">All tracked assignments are submitted or graded.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {drivers.map((driver) => (
            <div className="rounded-2xl border border-border bg-background p-3" key={driver.label}>
              <p className="text-2xl font-semibold tracking-tight">{driver.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{driver.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkloadTimeline({ workload }: { workload: AnalyticsWorkloadDay[] }) {
  const maxMinutes = Math.max(...workload.map((day) => day.minutes), 1);
  const peakDay = [...workload].sort((a, b) => b.minutes - a.minutes)[0];
  const hasWorkload = workload.some((day) => day.minutes > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>7-day workload</CardTitle>
        <CardDescription>
          {hasWorkload
            ? `${peakDay.label} is the heaviest day with ${formatEffort(peakDay.minutes)} planned by due date.`
            : "No open assignments are due in the next seven days."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {workload.map((day) => (
          <div className="grid gap-2" key={day.isoDate}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{day.label}</span>
              <span className="text-muted-foreground">
                {day.assignmentCount} task{day.assignmentCount === 1 ? "" : "s"} / {formatEffort(day.minutes)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.max(4, (day.minutes / maxMinutes) * 100)}%`, opacity: day.minutes ? 1 : 0.15 }}
              />
            </div>
            {day.titles.length ? (
              <p className="truncate text-xs text-muted-foreground">{day.titles.join(", ")}</p>
            ) : (
              <p className="text-xs text-muted-foreground">No due-date pressure.</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CourseHealthTable({ rows }: { rows: AnalyticsCourseHealth[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Course health</CardTitle>
          <CardDescription>Highest-risk courses rise to the top for fast scanning.</CardDescription>
        </div>
        <Button asChild variant="secondary">
          <Link href="/assignments">View assignments</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <article
            className="grid gap-4 rounded-2xl border border-border bg-background p-4 md:grid-cols-[minmax(0,1.2fr)_120px_120px_120px]"
            key={row.id}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{row.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">{row.code || "Course"}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {row.missingCount} missing, {row.dueSoonCount} due soon, {formatEffort(row.effortMinutes)} open.
              </p>
            </div>

            <StatBlock label="Risk" value={`${row.riskScore}`} badge={row.riskLevel} />
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Completion</p>
              <p className="mt-2 text-sm font-semibold">{row.completionRate}%</p>
              <Progress aria-label={`${row.name} completion`} className="mt-2" value={row.completionRate} />
            </div>
            <StatBlock label="Materials" value={row.fileCount.toString()} />
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

function StatBlock({
  badge,
  label,
  value
}: {
  badge?: AnalyticsRiskLevel;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-sm font-semibold">{value}</p>
        {badge ? <Badge variant={getRiskBadgeVariant(badge)}>{badge}</Badge> : null}
      </div>
    </div>
  );
}

function AIInsightPanel({ recommendations }: { recommendations: AnalyticsRecommendation[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-foreground text-background">
            <Sparkles className="size-5" />
          </div>
          <div>
            <CardTitle>AI recommendations</CardTitle>
            <CardDescription>Contextual moves generated from your current workload.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((recommendation) => (
          <Link
            className={cn(
              "group block rounded-2xl border p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              getRecommendationClass(recommendation.tone)
            )}
            href={recommendation.href}
            key={recommendation.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{recommendation.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{recommendation.body}</p>
              </div>
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function FocusEffectivenessCard({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Focus coverage</CardTitle>
        <CardDescription>How much open work already has study time reserved.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {snapshot.partial.missingStudyBlocks ? (
          <PartialNotice
            body="No study blocks are available yet, so coverage is estimated from assignments only."
            title="Limited schedule data"
          />
        ) : null}
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Schedule coverage</span>
            <span className="font-medium">{snapshot.focus.scheduleCoverage}%</span>
          </div>
          <Progress aria-label="Schedule coverage" value={snapshot.focus.scheduleCoverage} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MiniMetric icon={Timer} label="Scheduled" value={formatEffort(snapshot.focus.scheduledMinutes)} />
          <MiniMetric icon={Sparkles} label="AI blocks" value={formatEffort(snapshot.focus.aiScheduledMinutes)} />
          <MiniMetric icon={CalendarDays} label="Protected" value={snapshot.focus.protectedEvents.toString()} />
        </div>
        <Button asChild className="w-full" variant="secondary">
          <Link href="/focus">
            Open focus mode
            <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function MaterialCoverageCard({
  missingFiles,
  rows
}: {
  missingFiles: boolean;
  rows: AnalyticsMaterialCoverage[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Material coverage</CardTitle>
        <CardDescription>AI answer quality improves when assignments are connected to files.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingFiles ? (
          <PartialNotice
            body="No indexed files are available, so suggestions cannot cite course materials yet."
            title="Materials not indexed"
          />
        ) : null}
        <div className="space-y-3">
          {rows.map((row) => (
            <div className="rounded-2xl border border-border bg-background p-3" key={row.courseId}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.courseName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.fileCount} files / {row.assignmentCount} assignments
                  </p>
                </div>
                <Badge variant={row.label === "Strong" ? "success" : row.label === "Developing" ? "info" : "warning"}>
                  {row.label}
                </Badge>
              </div>
              <Progress aria-label={`${row.courseName} material coverage`} className="mt-3" value={row.coverageScore} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Timer;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-background p-3">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-3 truncate text-sm font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PartialNotice({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5 opacity-85">{body}</p>
    </div>
  );
}

function getRiskBadgeVariant(level: AnalyticsRiskLevel): "secondary" | "success" | "warning" | "info" {
  if (level === "Low") {
    return "success";
  }

  if (level === "Moderate") {
    return "info";
  }

  return "warning";
}

function getRiskIconClass(level: AnalyticsRiskLevel): string {
  if (level === "Low") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (level === "Moderate") {
    return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }

  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function getRecommendationClass(tone: AnalyticsRecommendation["tone"]): string {
  if (tone === "warning") {
    return "border-amber-500/20 bg-amber-500/10";
  }

  if (tone === "success") {
    return "border-emerald-500/20 bg-emerald-500/10";
  }

  return "border-border bg-background";
}
