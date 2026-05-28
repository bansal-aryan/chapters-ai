"use client";

import { ExternalLink, FileText, Folder, Loader2, Plus, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import {
  resourceFiles as defaultResourceFiles,
  resourceFolders as defaultResourceFolders,
  type LockedResourceCourseOption,
  type LockedResourceFile,
  type LockedResourceFolder,
  type ResourceFileType
} from "./data";
import { ControlButton, LockedPage, LockedPageTitle } from "./primitives";
import { cn } from "@/lib/utils";

const tabs = ["My Resources", "Shared", "Collections"] as const;
const formFileTypes = ["pdf", "doc", "image", "link"] as const;

type LockedResourcesPageProps = {
  courseOptions?: readonly LockedResourceCourseOption[];
  files?: readonly LockedResourceFile[];
  folders?: readonly LockedResourceFolder[];
};

type FormFileType = (typeof formFileTypes)[number];

type ResourceResponse = {
  course_id: string;
  href?: string;
  id: string;
  source: "canvas" | "manual";
  title: string;
  type: FormFileType;
};

export function LockedResourcesPage({
  courseOptions = [],
  files = defaultResourceFiles,
  folders = defaultResourceFolders
}: LockedResourcesPageProps) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("My Resources");
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState({
    courseId: "",
    title: "",
    type: "link" as FormFileType,
    url: ""
  });
  const [addedFiles, setAddedFiles] = useState<LockedResourceFile[]>([]);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"error" | "success">("success");
  const [saving, setSaving] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const normalizedCourseOptions = useMemo(
    () =>
      courseOptions.length
        ? [...courseOptions]
        : folders.map((folder) => ({
            id: folder.id,
            label: folder.title
          })),
    [courseOptions, folders]
  );
  const localFiles = useMemo(() => {
    const seen = new Set<string>();

    return [...addedFiles, ...files].filter((file) => {
      if (seen.has(file.id)) {
        return false;
      }

      seen.add(file.id);
      return true;
    });
  }, [addedFiles, files]);
  const visibleFiles = useMemo(() => {
    if (tab !== "My Resources") {
      return [];
    }

    if (selectedFolderId === "all") {
      return localFiles;
    }

    return localFiles.filter((file) => file.courseId === selectedFolderId);
  }, [localFiles, selectedFolderId, tab]);
  const displayedFiles = showAll ? visibleFiles : visibleFiles.slice(0, 8);
  const visibleFolders = tab === "My Resources" ? folders : [];
  const activeCourseId = formState.courseId || normalizedCourseOptions[0]?.id || "";

  async function handleAddFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const courseId = activeCourseId;

    if (!courseId) {
      setNoticeTone("error");
      setNotice("Sync a Canvas course before adding resources.");
      return;
    }

    setSaving(true);
    setNotice("");

    const response = await fetch("/api/resources", {
      body: JSON.stringify({
        courseId,
        title: formState.title,
        type: formState.type,
        url: formState.url
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const result = (await response.json().catch(() => null)) as { error?: string; resource?: ResourceResponse } | null;
    setSaving(false);

    if (!response.ok || !result?.resource) {
      setNoticeTone("error");
      setNotice(result?.error ?? "Could not add that file.");
      return;
    }

    const courseLabel = normalizedCourseOptions.find((course) => course.id === result.resource?.course_id)?.label ?? "Manual";
    const fileType = toResourceFileType(result.resource.type);
    const nextFile: LockedResourceFile = {
      courseId: result.resource.course_id,
      date: courseLabel,
      href: result.resource.href,
      id: result.resource.id,
      meta: `${getResourceTypeLabel(fileType)} - Manual`,
      source: result.resource.source,
      title: result.resource.title,
      type: fileType
    };

    setAddedFiles((current) => [nextFile, ...current]);
    setSelectedFolderId(result.resource.course_id);
    setShowAll(false);
    setFormState({ courseId: result.resource.course_id, title: "", type: "link", url: "" });
    setFormOpen(false);
    setNoticeTone("success");
    setNotice(`${result.resource.title} was added to resources.`);
  }

  return (
    <LockedPage className="max-w-[980px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4">
          <LockedPageTitle title="Resources" />
          <div className="flex flex-wrap items-center gap-3">
            {tabs.map((item) => (
              <button
                className={cn(
                  "h-8 rounded-lg px-3 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
                  tab === item && "bg-violet-50 text-violet-700"
                )}
                key={item}
                onClick={() => setTab(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <ControlButton active={formOpen} onClick={() => setFormOpen((open) => !open)}>
          <Plus className="size-3.5" />
          Add file
        </ControlButton>
      </div>

      {formOpen ? (
        <form
          className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_10px_30px_rgba(24,24,27,0.035)] sm:grid-cols-2"
          onSubmit={handleAddFile}
        >
          <TextField
            label="Title"
            onChange={(value) => setFormState((current) => ({ ...current, title: value }))}
            placeholder="Lab rubric, formula sheet, article link"
            value={formState.title}
          />
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Course</span>
            <select
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-800 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              onChange={(event) => setFormState((current) => ({ ...current, courseId: event.target.value }))}
              value={activeCourseId}
            >
              {normalizedCourseOptions.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.label}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="URL"
            onChange={(value) => setFormState((current) => ({ ...current, url: value }))}
            placeholder="https://..."
            type="url"
            value={formState.url}
          />
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Type</span>
            <select
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-800 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              onChange={(event) =>
                setFormState((current) => ({ ...current, type: event.target.value as FormFileType }))
              }
              value={formState.type}
            >
              {formFileTypes.map((type) => (
                <option key={type} value={type}>
                  {formatOption(type)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
            <ControlButton
              onClick={() => {
                setFormOpen(false);
                setNotice("");
              }}
            >
              <X className="size-3.5" />
              Cancel
            </ControlButton>
            <ControlButton className="border-violet-600 bg-violet-600 text-white hover:bg-violet-700" disabled={saving} type="submit">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Add file
            </ControlButton>
          </div>
        </form>
      ) : null}

      {notice ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-[12px] font-medium",
            noticeTone === "error"
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-violet-100 bg-violet-50 text-violet-800"
          )}
        >
          {notice}
        </div>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold text-zinc-950">Folders</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <button
            className={folderButtonClasses(selectedFolderId === "all")}
            onClick={() => {
              setSelectedFolderId("all");
              setShowAll(false);
            }}
            type="button"
          >
            <span className="flex items-center gap-2 text-[12px] font-semibold text-zinc-950">
              <Folder className="size-4 text-zinc-600" />
              All resources
            </span>
            <span className="mt-1 text-[11px] font-medium text-zinc-500">
              {localFiles.length === 1 ? "1 item" : `${localFiles.length} items`}
            </span>
          </button>
          {visibleFolders.map((folder) => (
            <button
              className={folderButtonClasses(selectedFolderId === folder.id)}
              key={folder.id}
              onClick={() => {
                setSelectedFolderId(folder.id);
                setShowAll(false);
              }}
              type="button"
            >
              <span className="flex items-center gap-2 text-[12px] font-semibold text-zinc-950">
                <Folder className="size-4 text-zinc-600" />
                {folder.title}
              </span>
              <span className="mt-1 text-[11px] font-medium text-zinc-500">{folder.items}</span>
            </button>
          ))}
          <button
            aria-label="Add resource"
            className="flex min-h-[72px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            onClick={() => setFormOpen(true)}
            type="button"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold text-zinc-950">Files</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-100 bg-white">
          {visibleFiles.length ? (
            displayedFiles.map((file) => (
              <article
                className="grid min-h-[64px] grid-cols-[1fr_auto_32px] items-center gap-4 border-b border-zinc-100 px-3 last:border-b-0 sm:px-4"
                key={file.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md border",
                      file.type === "pdf" && "border-red-100 bg-red-50 text-red-600",
                      file.type === "docx" && "border-blue-100 bg-blue-50 text-blue-600",
                      file.type === "image" && "border-emerald-100 bg-emerald-50 text-emerald-600",
                      file.type === "link" && "border-zinc-200 bg-zinc-50 text-zinc-600"
                    )}
                  >
                    <FileText className="size-3.5" />
                  </span>
                  {file.href ? (
                    <a className="min-w-0 hover:text-violet-700" href={file.href} rel="noreferrer" target="_blank">
                      <h3 className="truncate text-[12px] font-semibold text-zinc-950">{file.title}</h3>
                      <p className="mt-1 text-[11px] font-medium text-zinc-500">{file.meta}</p>
                    </a>
                  ) : (
                    <button
                      className="min-w-0 text-left"
                      onClick={() => {
                        setNoticeTone("error");
                        setNotice(`${file.title} does not include a Canvas URL yet.`);
                      }}
                      type="button"
                    >
                      <h3 className="truncate text-[12px] font-semibold text-zinc-950">{file.title}</h3>
                      <p className="mt-1 text-[11px] font-medium text-zinc-500">{file.meta}</p>
                    </button>
                  )}
                </div>
                <time className="hidden text-[11px] text-zinc-500 sm:block">{file.date}</time>
                {file.href ? (
                  <a
                    aria-label={`Open ${file.title}`}
                    className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                    href={file.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                ) : (
                  <button
                    aria-label={`Open ${file.title}`}
                    className="flex size-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                    onClick={() => {
                      setNoticeTone("error");
                      setNotice(`${file.title} does not include a Canvas URL yet.`);
                    }}
                    type="button"
                  >
                    <ExternalLink className="size-4" />
                  </button>
                )}
              </article>
            ))
          ) : (
            <div className="flex min-h-[148px] items-center justify-center px-5 text-center text-[13px] font-medium text-zinc-500">
              {selectedFolderId === "all" ? "No synced files yet." : "No files in this folder yet."}
            </div>
          )}
        </div>
      </section>

      {visibleFiles.length > displayedFiles.length ? (
        <button
          className="mx-auto rounded-lg px-4 py-2 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          onClick={() => setShowAll(true)}
          type="button"
        >
          View all files
        </button>
      ) : null}
    </LockedPage>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        type={type}
        value={value}
      />
    </label>
  );
}

function folderButtonClasses(active: boolean) {
  return cn(
    "flex min-h-[72px] flex-col items-start justify-center rounded-lg border px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
    active
      ? "border-violet-200 bg-violet-50"
      : "border-zinc-200 bg-zinc-50 hover:border-violet-200 hover:bg-violet-50"
  );
}

function toResourceFileType(type: FormFileType): ResourceFileType {
  return type === "doc" ? "docx" : type;
}

function getResourceTypeLabel(type: ResourceFileType) {
  if (type === "docx") {
    return "DOCX";
  }

  return type.toUpperCase();
}

function formatOption(value: string) {
  return value === "doc" ? "Document" : value.charAt(0).toUpperCase() + value.slice(1);
}
