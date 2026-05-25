import {
  ArrowLeft,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquareText,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import * as demoData from "@/data/demo-data";
import { formatDateTime } from "@/lib/domain/format";
import { formatEffort, getPriorityReason } from "@/lib/domain/prioritization";
import { getWorkspaceSnapshotFromSupabase } from "@/lib/supabase/workspace";

type AssignmentPageProps = {
  params: Promise<{
    assignmentId: string;
  }>;
};

export function generateStaticParams() {
  return demoData.assignments.map((assignment) => ({
    assignmentId: assignment.id
  }));
}

export const dynamic = "force-dynamic";

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const { assignmentId } = await params;
  const snapshot = await getWorkspaceSnapshotFromSupabase();
  const assignments = snapshot?.assignments ?? demoData.assignments;
  const courses = snapshot?.courses ?? demoData.courses;
  const files = snapshot?.files ?? demoData.files;
  const studyBlocksSnapshot = snapshot?.studyBlocks ?? demoData.studyBlocks;
  const assignment = assignments.find((item) => item.id === assignmentId);

  if (!assignment) {
    notFound();
  }

  const course = courses.find((item) => item.id === assignment.courseId);
  const relatedFiles = files.filter((file) => assignment.relatedFileIds.includes(file.id));
  const relatedAssignments = assignments.filter((item) => assignment.relatedAssignmentIds.includes(item.id));
  const studyBlocks = studyBlocksSnapshot.filter((block) => block.assignmentId === assignment.id);

  return (
    <AppShell>
      <main className="mx-auto grid max-w-7xl gap-6">
        <Button asChild className="w-fit" variant="ghost">
          <Link href="/dashboard">
            <ArrowLeft />
            Back to dashboard
          </Link>
        </Button>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="overflow-hidden">
            <div className="p-6 md:p-8">
              <PageHeader
                description={assignment.summary}
                eyebrow="Assignment workspace"
                title={assignment.title}
                action={
                  <div className="flex flex-wrap gap-2">
                    {course ? <Badge variant="secondary">{course.name}</Badge> : null}
                    <Badge variant={assignment.source === "canvas" ? "success" : "info"}>{assignment.source}</Badge>
                    {assignment.status === "missing" ? <Badge variant="warning">Missing</Badge> : null}
                  </div>
                }
              />
            </div>
            <div className="grid border-t border-border bg-muted/30 md:grid-cols-3">
              <Stat icon={CalendarDays} label="Due" value={formatDateTime(assignment.dueDate)} />
              <Stat icon={Clock3} label="Effort" value={formatEffort(assignment.estimatedEffortMinutes)} />
              <Stat icon={Sparkles} label="Priority" value={getPriorityReason(assignment)} />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI guidance boundary</CardTitle>
              <CardDescription>Help the student think, do not complete the assignment for them.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
                The assistant can explain concepts, check attempts, ask guiding questions, and cite course material.
              </div>
              <Progress className="mt-5" value={assignment.status === "missing" ? 12 : 48} />
              <p className="mt-2 text-xs text-muted-foreground">Estimated progress from status and study blocks.</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.75fr)]">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>AI work plan</CardTitle>
                <CardDescription>Three clear moves, surfaced only when useful.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {[
                  ["Understand the prompt", assignment.description],
                  ["Open the highest-signal materials", "Start with the rubric or source packet, then ask class chat for clarification with citations."],
                  ["Draft, check, and revise", "Paste your attempt into chat. The AI should mark reasoning gaps and nudge you toward the right reasoning."]
                ].map(([title, body], index) => (
                  <div className="grid gap-4 rounded-2xl border border-border bg-background p-4 sm:grid-cols-[36px_minmax(0,1fr)]" key={title}>
                    <div className="flex size-9 items-center justify-center rounded-2xl bg-muted text-sm font-semibold text-muted-foreground">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Related course material</CardTitle>
                <CardDescription>Cited sources from Canvas files, modules, and manual uploads.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {relatedFiles.map((file) => (
                  <article className="rounded-2xl border border-border bg-background p-4" key={file.id}>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <FileText className="size-5" />
                      </div>
                      <Badge variant={file.source === "canvas" ? "success" : "info"}>{file.type}</Badge>
                    </div>
                    <h3 className="text-sm font-semibold">{file.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{file.summary}</p>
                    <p className="mt-4 text-xs text-muted-foreground">{file.citation}</p>
                  </article>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Related past assignments</CardTitle>
                <CardDescription>Prior work that can help the student transfer understanding.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {relatedAssignments.length ? (
                  relatedAssignments.map((relatedAssignment) => (
                    <Link
                      className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4 transition-colors hover:bg-muted/40"
                      href={`/assignments/${relatedAssignment.id}`}
                      key={relatedAssignment.id}
                    >
                      <div>
                        <p className="text-sm font-medium">{relatedAssignment.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{relatedAssignment.summary}</p>
                      </div>
                      <Badge variant="secondary">{formatDateTime(relatedAssignment.dueDate)}</Badge>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                    <BookOpen className="mx-auto mb-3 size-5 text-muted-foreground" />
                    <p className="text-sm font-medium">No related prior assignments yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">The search graph will improve as more coursework is indexed.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="grid gap-6 self-start">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-foreground text-background">
                    <Brain className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Ask about this</CardTitle>
                    <CardDescription>Scoped to the assignment and cited materials.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
                  I can quiz you, explain the prompt, review your attempt, or build a study plan. I will cite the sources I use.
                </div>
                <div className="mt-4 flex gap-2">
                  <Input aria-label="Ask about this assignment" placeholder="Check my answer..." />
                  <Button size="icon" type="button">
                    <MessageSquareText />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scheduled work</CardTitle>
                <CardDescription>AI blocks tied to this assignment.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {studyBlocks.length ? (
                  studyBlocks.map((block) => (
                    <article className="rounded-2xl border border-border bg-background p-4" key={block.id}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{block.title}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDateTime(block.startTime)} - {formatDateTime(block.endTime)}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                    <p className="text-sm font-medium">No study blocks yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">chapters.ai can generate a schedule when you are ready.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-border p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="mb-3 flex size-9 items-center justify-center rounded-2xl bg-card text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}
