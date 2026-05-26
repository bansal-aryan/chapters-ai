import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { lockedUser } from "@/components/locked-ui/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWorkspaceSnapshotFromSupabase, type WorkspaceSnapshot } from "@/lib/supabase/workspace";
import type { Assignment } from "@/types";

export const dynamic = "force-dynamic";

type ShellNotification = {
  href: string;
  id: string;
  label: string;
  tone: "amber" | "emerald" | "slate" | "violet";
  title: string;
};

export async function GET() {
  const cookieStore = await cookies();
  const hasDemoSession = cookieStore.get("chapters_demo_session")?.value === "1";
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json({
      canvas: { connected: false },
      notifications: [],
      user: hasDemoSession ? demoUser() : null
    });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      canvas: { connected: false },
      notifications: hasDemoSession ? demoNotifications() : [],
      user: hasDemoSession ? demoUser() : null
    });
  }

  const snapshot = await getWorkspaceSnapshotFromSupabase({ allowEmpty: true });
  const fullName = snapshot?.profile?.fullName || getUserName(user.email, user.user_metadata?.full_name);
  const activeConnection = snapshot?.canvasConnections.find((connection) => connection.status === "connected");

  return NextResponse.json({
    canvas: {
      connected: Boolean(activeConnection),
      domain: activeConnection?.domain,
      lastSyncedAt: activeConnection?.lastSyncedAt,
      status: activeConnection?.status ?? snapshot?.canvasConnections[0]?.status ?? "not_connected"
    },
    notifications: buildNotifications(snapshot),
    user: {
      email: user.email ?? null,
      initials: getInitials(fullName),
      name: fullName
    }
  });
}

function demoUser() {
  return {
    email: null,
    initials: lockedUser.initials,
    name: lockedUser.name
  };
}

function demoNotifications(): ShellNotification[] {
  return [
    {
      href: "/assignments",
      id: "demo-due",
      label: "Demo",
      tone: "violet",
      title: "Connect a real account to see live notifications."
    }
  ];
}

function buildNotifications(snapshot: WorkspaceSnapshot | null): ShellNotification[] {
  if (!snapshot) {
    return [];
  }

  const now = Date.now();
  const dueSoon = snapshot.assignments
    .filter((assignment) => !isCompleted(assignment))
    .map((assignment) => ({
      assignment,
      dueTime: new Date(assignment.dueDate).getTime()
    }))
    .filter(({ dueTime }) => Number.isFinite(dueTime))
    .sort((first, second) => first.dueTime - second.dueTime)
    .slice(0, 4);

  const assignmentNotifications = dueSoon.map<ShellNotification>(({ assignment, dueTime }) => {
    const overdue = dueTime < now;

    return {
      href: `/assignments/${assignment.id}`,
      id: `assignment-${assignment.id}`,
      label: overdue ? "Overdue" : "Due soon",
      tone: overdue ? "amber" : "violet",
      title: assignment.title
    };
  });

  const canvasNotifications = snapshot.canvasConnections.map<ShellNotification>((connection) => ({
    href: "/settings",
    id: `canvas-${connection.id}`,
    label: connection.status === "connected" ? "Canvas" : "Action needed",
    tone: connection.status === "connected" ? "emerald" : "amber",
    title:
      connection.status === "connected"
        ? `Canvas connected${connection.lastSyncedAt ? `, synced ${formatShortDate(connection.lastSyncedAt)}` : ""}.`
        : `Reconnect Canvas for ${connection.domain}.`
  }));

  return [...assignmentNotifications, ...canvasNotifications].slice(0, 6);
}

function isCompleted(assignment: Assignment) {
  return assignment.status === "submitted" || assignment.status === "graded";
}

function getUserName(email: string | undefined, metadataName: unknown) {
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  if (email) {
    return email.split("@")[0];
  }

  return "Student";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "ST";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatShortDate(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short"
  }).format(date);
}
