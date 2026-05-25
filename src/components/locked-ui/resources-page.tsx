"use client";

import { FileText, Folder, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import {
  resourceFiles as defaultResourceFiles,
  resourceFolders as defaultResourceFolders,
  type LockedResourceFile,
  type LockedResourceFolder
} from "./data";
import { ControlButton, LockedPage, LockedPageTitle } from "./primitives";
import { cn } from "@/lib/utils";

const tabs = ["My Resources", "Shared", "Collections"] as const;

type LockedResourcesPageProps = {
  files?: readonly LockedResourceFile[];
  folders?: readonly LockedResourceFolder[];
};

export function LockedResourcesPage({
  files = defaultResourceFiles,
  folders = defaultResourceFolders
}: LockedResourcesPageProps) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("My Resources");

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
        <ControlButton>New Folder</ControlButton>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold text-zinc-950">Folders</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {folders.map((folder) => (
            <button
              className="flex min-h-[72px] flex-col items-start justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-left transition-colors hover:border-violet-200 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              key={folder.id}
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
            aria-label="Create folder"
            className="flex min-h-[72px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            type="button"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold text-zinc-950">Files</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-100 bg-white">
          {files.length ? (
            files.map((file) => (
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
                  <div className="min-w-0">
                    <h3 className="truncate text-[12px] font-semibold text-zinc-950">{file.title}</h3>
                    <p className="mt-1 text-[11px] font-medium text-zinc-500">{file.meta}</p>
                  </div>
                </div>
                <time className="hidden text-[11px] text-zinc-500 sm:block">{file.date}</time>
                <button
                  aria-label={`More actions for ${file.title}`}
                  className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                  type="button"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </article>
            ))
          ) : (
            <div className="flex min-h-[148px] items-center justify-center px-5 text-center text-[13px] font-medium text-zinc-500">
              No synced files yet.
            </div>
          )}
        </div>
      </section>

      {files.length > 5 ? (
        <button
          className="mx-auto rounded-lg px-4 py-2 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          type="button"
        >
          View all files
        </button>
      ) : null}
    </LockedPage>
  );
}
