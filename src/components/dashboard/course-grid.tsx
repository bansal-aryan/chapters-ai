import { ArrowRight, BookOpen, FileText } from "lucide-react";
import Link from "next/link";
import type { Assignment, Course, FileResource } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CourseGridProps = {
  assignments: Assignment[];
  courses: Course[];
  files: FileResource[];
};

export function CourseGrid({ assignments, courses, files }: CourseGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Class workspaces</CardTitle>
        <CardDescription>Each class has local tasks, search, cram mode, and scoped AI chat.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const assignmentCount = assignments.filter((assignment) => assignment.courseId === course.id).length;
          const fileCount = files.filter((file) => file.courseId === course.id).length;

          return (
            <Link
              className="group rounded-2xl border border-border bg-background p-4 transition-all hover:border-foreground/20 hover:bg-muted/40"
              href={`/classes/${course.id}`}
              key={course.id}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="h-2 w-12 rounded-full" style={{ backgroundColor: course.color }} />
                <Badge variant={course.source === "canvas" ? "success" : "info"}>{course.source}</Badge>
              </div>
              <h3 className="text-base font-semibold">{course.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{course.code} / {course.term}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/50 p-3">
                  <BookOpen className="mb-2 size-4 text-muted-foreground" />
                  <p className="text-lg font-semibold">{assignmentCount}</p>
                  <p className="text-xs text-muted-foreground">tasks</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-3">
                  <FileText className="mb-2 size-4 text-muted-foreground" />
                  <p className="text-lg font-semibold">{fileCount}</p>
                  <p className="text-xs text-muted-foreground">materials</p>
                </div>
              </div>
              <Button className="mt-5 w-full justify-between" variant="secondary">
                Open class
                <ArrowRight />
              </Button>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
