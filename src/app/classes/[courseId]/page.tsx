import { Brain, FileText, Layers3, MessageSquareText, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { AssignmentList } from "@/components/dashboard/assignment-list";
import { FileSearch } from "@/components/dashboard/file-search";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import * as demoData from "@/data/demo-data";
import { getPriorityRank } from "@/lib/domain/prioritization";
import { getWorkspaceSnapshotFromSupabase } from "@/lib/supabase/workspace";

type ClassPageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export function generateStaticParams() {
  return demoData.courses.map((course) => ({
    courseId: course.id
  }));
}

export const dynamic = "force-dynamic";

export default async function ClassPage({ params }: ClassPageProps) {
  const { courseId } = await params;
  const snapshot = await getWorkspaceSnapshotFromSupabase();
  const courses = snapshot?.courses ?? demoData.courses;
  const assignments = snapshot?.assignments ?? demoData.assignments;
  const files = snapshot?.files ?? demoData.files;
  const course = courses.find((item) => item.id === courseId);

  if (!course) {
    notFound();
  }

  const courseAssignments = assignments.filter((assignment) => assignment.courseId === course.id);
  const courseFiles = files.filter((file) => file.courseId === course.id);
  const prioritizedAssignments = getPriorityRank(courseAssignments);

  return (
    <AppShell>
      <main className="mx-auto grid max-w-7xl gap-6">
        <Card className="overflow-hidden">
          <div className="h-2" style={{ backgroundColor: course.color }} />
          <div className="p-6 md:p-8">
            <PageHeader
              description={`Local assignments, files, modules, cram mode, and class-specific chat for ${course.code}.`}
              eyebrow="Class workspace"
              title={course.name}
              action={<Badge variant={course.source === "canvas" ? "success" : "info"}>{course.source}</Badge>}
            />
          </div>
          <div className="grid border-t border-border bg-muted/30 md:grid-cols-3">
            <ClassStat icon={Layers3} label="Assignments" value={courseAssignments.length.toString()} />
            <ClassStat icon={FileText} label="Materials" value={courseFiles.length.toString()} />
            <ClassStat icon={Sparkles} label="Term" value={course.term} />
          </div>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.75fr)]">
          <div className="grid gap-6">
            <AssignmentList assignments={prioritizedAssignments} courses={[course]} />

            <Card>
              <CardHeader>
                <CardTitle>Cram mode</CardTitle>
                <CardDescription>Generate focused study artifacts from this class, with citations.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {["Study guide", "Flashcards", "Practice quiz", "Timeline", "Tutor chat"].map((mode) => (
                  <button
                    className="rounded-2xl border border-border bg-background p-4 text-left text-sm font-medium transition-all hover:border-foreground/20 hover:bg-muted/40"
                    key={mode}
                    type="button"
                  >
                    {mode}
                  </button>
                ))}
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
                    <CardTitle>{course.name} chat</CardTitle>
                    <CardDescription>Scoped locally unless the student asks globally.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
                  Ask me to find a file, explain a module, make a cram plan, or review your answer using {course.name} materials.
                </div>
                <div className="mt-4 flex gap-2">
                  <Input aria-label={`Ask ${course.name} chat`} placeholder="Help me study this unit..." />
                  <Button size="icon" type="button">
                    <MessageSquareText />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <FileSearch courses={[course]} files={courseFiles} />
          </aside>
        </section>
      </main>
    </AppShell>
  );
}

function ClassStat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Layers3;
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
