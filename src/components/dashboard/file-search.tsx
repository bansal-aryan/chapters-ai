"use client";

import { FileSearch as FileSearchIcon, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Course, FileResource } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FileSearchProps = {
  courses: Course[];
  files: FileResource[];
  initialQuery?: string;
};

export function FileSearch({ courses, files, initialQuery = "" }: FileSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const results = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return files;
    }

    return files.filter((file) => `${file.title} ${file.summary}`.toLowerCase().includes(normalizedQuery));
  }, [files, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course search</CardTitle>
        <CardDescription>Find relevant files, modules, and citations without leaving context.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="mb-4 flex gap-2" onSubmit={(event) => event.preventDefault()}>
          <Input
            aria-label="Search course materials"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search materials..."
            value={query}
          />
          <Button size="icon" type="submit" variant="secondary">
            <Search />
          </Button>
        </form>
        <div className="grid gap-3">
          {results.length ? (
            results.map((file) => (
              <article className="rounded-2xl border border-border bg-background p-4" key={file.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      <FileSearchIcon className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{file.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{file.summary}</p>
                    </div>
                  </div>
                  <Badge variant={file.source === "canvas" ? "success" : "info"}>{file.type}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {courseById.get(file.courseId)?.name} / {file.citation}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <p className="text-sm font-medium">No matches yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a broader phrase or ask the class assistant.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
