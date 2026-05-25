import { ArrowRight, Clock3 } from "lucide-react";
import Link from "next/link";
import type { Assignment, Course } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/domain/format";
import { formatEffort, getPriorityReason } from "@/lib/domain/prioritization";

type AssignmentListProps = {
  assignments: Assignment[];
  courses: Course[];
  title?: string;
  description?: string;
};

export function AssignmentList({
  assignments,
  courses,
  title = "Priority queue",
  description = "Ranked by missing status, student overrides, due date, and estimated effort."
}: AssignmentListProps) {
  const courseById = new Map(courses.map((course) => [course.id, course]));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="secondary">Add task</Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {assignments.map((assignment, index) => {
          const course = courseById.get(assignment.courseId);

          return (
            <Link
              className="group grid gap-4 rounded-2xl border border-border bg-background p-4 transition-all hover:border-foreground/20 hover:bg-muted/40 md:grid-cols-[40px_minmax(0,1fr)_auto]"
              href={`/assignments/${assignment.id}`}
              key={assignment.id}
            >
              <div className="flex size-10 items-center justify-center rounded-2xl bg-muted text-sm font-semibold text-muted-foreground">
                {index + 1}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{assignment.title}</h3>
                  <Badge variant={assignment.source === "canvas" ? "success" : "info"}>{assignment.source}</Badge>
                  {assignment.status === "missing" ? <Badge variant="warning">Missing</Badge> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{assignment.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{course?.name ?? "Unknown course"}</span>
                  <span>/</span>
                  <span>Due {formatDateTime(assignment.dueDate)}</span>
                  <span>/</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3" />
                    {formatEffort(assignment.estimatedEffortMinutes)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{getPriorityReason(assignment)}</p>
              </div>
              <div className="flex items-center justify-between gap-3 md:justify-end">
                <Button asChild variant="secondary">
                  <span>
                    Open
                    <ArrowRight />
                  </span>
                </Button>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
