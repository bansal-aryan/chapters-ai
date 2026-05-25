import type * as React from "react";
import { cn } from "@/lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value: number;
};

export function Progress({ value, className, ...props }: ProgressProps) {
  const boundedValue = Math.min(Math.max(value, 0), 100);
  const ariaLabel = props["aria-label"] ?? "Progress";

  return (
    <div
      aria-label={ariaLabel}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={boundedValue}
      className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${boundedValue}%` }}
      />
    </div>
  );
}
