import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { AssignmentPriority, EventTone } from "./data";

export function LockedPage({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn("mx-auto flex w-full max-w-[1080px] flex-col gap-6 px-5 py-6 sm:px-8 lg:px-9", className)}
      {...props}
    />
  );
}

export function LockedPageTitle({
  description,
  title
}: {
  description?: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-[21px] font-semibold leading-7 tracking-normal text-zinc-950">{title}</h1>
      {description ? <p className="text-[13px] leading-5 text-zinc-500">{description}</p> : null}
    </div>
  );
}

export function ControlButton({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
        active && "border-violet-100 bg-violet-50 text-violet-700",
        className
      )}
      type="button"
      {...props}
    />
  );
}

export function SoftPanel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("rounded-lg border border-zinc-200 bg-white shadow-[0_10px_34px_rgba(24,24,27,0.04)]", className)}
      {...props}
    />
  );
}

export function SegmentedControl<TValue extends string>({
  options,
  value,
  onChange
}: {
  options: readonly TValue[];
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="inline-flex h-9 rounded-lg border border-zinc-200 bg-white p-0.5 shadow-sm">
      {options.map((option) => (
        <button
          aria-pressed={value === option}
          className={cn(
            "min-w-16 rounded-md px-3 text-[12px] font-medium text-zinc-600 transition-colors hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
            value === option && "bg-violet-50 text-violet-700 shadow-sm"
          )}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function PriorityPill({ priority }: { priority: AssignmentPriority }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 text-[12px] font-medium",
        priority === "High" && "bg-violet-50 text-violet-700",
        priority === "Medium" && "bg-orange-50 text-orange-700",
        priority === "Low" && "bg-zinc-100 text-zinc-500"
      )}
    >
      {priority}
    </span>
  );
}

export function AccentRing({ accent }: { accent: string }) {
  return (
    <span
      className={cn(
        "mt-1 size-4 shrink-0 rounded-full border-2 bg-white",
        accent === "purple" && "border-violet-500",
        accent === "orange" && "border-orange-500",
        accent === "slate" && "border-slate-400"
      )}
    />
  );
}

export function eventToneClasses(tone: EventTone) {
  if (tone === "blue") {
    return "border-violet-300 bg-violet-50 text-zinc-950";
  }

  if (tone === "orange") {
    return "border-orange-200 bg-orange-50 text-zinc-950";
  }

  if (tone === "neutral") {
    return "border-zinc-200 bg-zinc-50 text-zinc-800";
  }

  return "border-violet-300 bg-violet-50 text-zinc-950";
}
