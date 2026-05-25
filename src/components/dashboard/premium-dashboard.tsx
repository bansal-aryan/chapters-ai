"use client";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Flame,
  Sparkles,
  Target
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Assignment, Course, FileResource, ManualEvent, StudyBlock } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatDateTime } from "@/lib/domain/format";
import { formatEffort, getPriorityReason } from "@/lib/domain/prioritization";
import { cn } from "@/lib/utils";

type PremiumDashboardProps = {
  assignments: Assignment[];
  courses: Course[];
  files: FileResource[];
  manualEvents: ManualEvent[];
  prioritizedAssignments: Assignment[];
  studyBlocks: StudyBlock[];
};

const reveal = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 }
};

export function PremiumDashboard({
  assignments,
  courses,
  files,
  manualEvents,
  prioritizedAssignments,
  studyBlocks
}: PremiumDashboardProps) {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const missingCount = assignments.filter((assignment) => assignment.status === "missing").length;
  const completedCount = assignments.filter((assignment) => assignment.status === "submitted" || assignment.status === "graded").length;
  const totalEffort = assignments.reduce((sum, assignment) => sum + assignment.estimatedEffortMinutes, 0);
  const firstPriority = prioritizedAssignments[0];

  return (
    <motion.main
      animate="show"
      className="mx-auto grid max-w-7xl gap-6"
      initial="hidden"
      transition={{ staggerChildren: 0.05 }}
    >
      <motion.section
        className="overflow-hidden rounded-[2rem] border border-border/80 bg-card p-5 shadow-panel sm:p-6"
        variants={reveal}
      >
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Good morning, Arya</h1>
            <p className="mt-2 text-sm text-muted-foreground">Here is your plan for today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">
              <Sparkles className="size-3" />
              AI plan ready
            </Badge>
            <Button asChild>
              <Link href={firstPriority ? `/assignments/${firstPriority.id}` : "/assignments"}>
                Start top priority
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Top priorities</CardTitle>
                <CardDescription>Missing work first, then due date and effort.</CardDescription>
              </div>
              <Button asChild variant="secondary">
                <Link href="/assignments">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              {prioritizedAssignments.slice(0, 4).map((assignment, index) => (
                <PriorityRow
                  assignment={assignment}
                  courseName={courseById.get(assignment.courseId)?.name ?? "Course"}
                  index={index}
                  key={assignment.id}
                />
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <FocusPreview assignment={firstPriority} courseName={firstPriority ? courseById.get(firstPriority.courseId)?.name : undefined} />
            <AssistantPanel />
          </div>
        </div>
      </motion.section>

      <motion.section className="grid gap-4 md:grid-cols-4" variants={reveal}>
        <MetricCard icon={BookOpen} label="Active courses" value={courses.length.toString()} />
        <MetricCard icon={CheckCircle2} label="Prioritized tasks" value={assignments.length.toString()} />
        <MetricCard icon={FileText} label="Indexed materials" value={files.length.toString()} />
        <MetricCard icon={Clock3} label="Workload estimate" value={formatEffort(totalEffort)} />
      </motion.section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <motion.div className="grid gap-6" variants={reveal}>
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s schedule</CardTitle>
              <CardDescription>Study blocks auto-fit around due dates and protected events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {studyBlocks.map((block) => (
                <ScheduleRow
                  assignmentTitle={assignments.find((assignment) => assignment.id === block.assignmentId)?.title}
                  block={block}
                  key={block.id}
                />
              ))}
              {manualEvents.slice(0, 1).map((event) => (
                <div className="grid gap-2 rounded-2xl border border-border/80 bg-background p-4 sm:grid-cols-[88px_minmax(0,1fr)]" key={event.id}>
                  <p className="text-sm text-muted-foreground">{formatDateTime(event.startTime)}</p>
                  <div>
                    <p className="text-sm font-semibold">{event.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Protected from study scheduling</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.aside className="grid gap-6 self-start lg:grid-cols-2 xl:grid-cols-1" variants={reveal}>
          <AnalyticsPanel completedCount={completedCount} missingCount={missingCount} />
          <SuggestionsPanel />
          <CanvasConnectionCard />
        </motion.aside>
      </section>
    </motion.main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-muted text-brand">
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

function ScheduleRow({
  assignmentTitle,
  block
}: {
  assignmentTitle?: string;
  block: StudyBlock;
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-border/80 bg-background p-4 sm:grid-cols-[88px_minmax(0,1fr)_auto]">
      <p className="text-sm text-muted-foreground">{formatDateTime(block.startTime)}</p>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{block.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{assignmentTitle ?? "AI scheduled study block"}</p>
      </div>
      <Badge variant={block.source === "ai" ? "info" : "secondary"}>{block.source === "ai" ? "AI" : "Manual"}</Badge>
    </div>
  );
}

function PriorityRow({
  assignment,
  courseName,
  index
}: {
  assignment: Assignment;
  courseName: string;
  index: number;
}) {
  return (
    <Link
      className="group grid gap-4 rounded-2xl border border-border/80 bg-background p-4 transition-all hover:border-brand/30 hover:bg-brand-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[36px_minmax(0,1fr)_auto]"
      href={`/assignments/${assignment.id}`}
    >
      <div className="flex size-9 items-center justify-center rounded-2xl bg-muted text-sm font-semibold text-brand">
        {index + 1}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{assignment.title}</h3>
          {assignment.status === "missing" ? <Badge variant="warning">Missing</Badge> : null}
          <Badge variant={assignment.source === "canvas" ? "success" : "info"}>{assignment.source}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{assignment.summary}</p>
        <p className="mt-2 text-xs text-muted-foreground">{getPriorityReason(assignment)}</p>
      </div>
      <div className="flex items-center gap-3 md:justify-end">
        <div className="text-left md:text-right">
          <p className="text-sm font-medium">{formatEffort(assignment.estimatedEffortMinutes)}</p>
          <p className="text-xs text-muted-foreground">{courseName} / {formatDateTime(assignment.dueDate)}</p>
        </div>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function FocusPreview({
  assignment,
  courseName
}: {
  assignment?: Assignment;
  courseName?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Focus mode</CardTitle>
          <Badge variant="secondary">25 min</Badge>
        </div>
        <CardDescription>One task, one timer, one assistant. No dashboard noise.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-border/80 bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current task</p>
          <p className="mt-2 text-sm font-semibold">{assignment?.title ?? "Choose a task"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{courseName ?? "AI will pick the best next task."}</p>
          <Progress className="mt-4" value={42} />
        </div>
        <Button asChild className="mt-4 w-full" variant="secondary">
          <Link href="/focus">
            Start focus session
            <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function AnalyticsPanel({
  completedCount,
  missingCount
}: {
  completedCount: number;
  missingCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Study analytics</CardTitle>
            <CardDescription>Open the deeper view when you need workload and risk context.</CardDescription>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-muted text-brand">
            <BarChart3 className="size-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Weekly plan confidence</span>
            <span className="font-medium">78%</span>
          </div>
          <Progress value={78} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-background p-3">
            <p className="text-2xl font-semibold">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Submitted</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-3">
            <p className={cn("text-2xl font-semibold", missingCount ? "text-amber-600 dark:text-amber-300" : "")}>{missingCount}</p>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </div>
        </div>
        <Button asChild className="w-full" variant="secondary">
          <Link href="/analytics">
            Open analytics
            <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function AssistantPanel() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-muted text-brand">
            <Brain className="size-5" />
          </div>
          <div>
            <CardTitle>AI insight</CardTitle>
            <CardDescription>Contextual, cited, and action-oriented.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-7 text-foreground">
          You have 3 high priority tasks due this week. Want me to build a study plan around practice and your next deadline?
        </p>
        <Button asChild className="mt-5 px-0 text-brand hover:text-brand" variant="ghost">
          <Link href="/assistant">
            Generate plan
            <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function CanvasConnectionCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Canvas connection</CardTitle>
            <CardDescription>Bring assignments, files, modules, and due dates into Chapters.</CardDescription>
          </div>
          <Badge variant="success">Ready</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input defaultValue="school.instructure.com" aria-label="Canvas domain" />
        <Button className="w-full" variant="secondary">
          Prepare secure login
        </Button>
      </CardContent>
    </Card>
  );
}

function SuggestionsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI suggestions</CardTitle>
        <CardDescription>Progressive recommendations without overwhelming the page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          { icon: Flame, title: "Recover the missing quiz", body: "45 minutes is enough to review and submit." },
          { icon: CalendarDays, title: "Split the lab report", body: "Draft discussion tonight, polish figures tomorrow." },
          { icon: Target, title: "Use related files", body: "Open rubric before writing to avoid rework." }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div className="flex gap-3 rounded-2xl border border-border bg-background p-3" key={item.title}>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
                <Icon className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs leading-5 text-muted-foreground">{item.body}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
