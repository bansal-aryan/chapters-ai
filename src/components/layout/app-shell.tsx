"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Command,
  FileCheck2,
  FolderOpen,
  Home,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { lockedUser } from "@/components/locked-ui/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
};

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Assignments", href: "/assignments", icon: FileCheck2 },
  { label: "Focus Mode", href: "/focus", icon: Target },
  { label: "AI Assistant", href: "/assistant", icon: Sparkles },
  { label: "Resources", href: "/resources", icon: FolderOpen }
] as const;

const utilityNavigation = [
  { label: "Settings", href: "/settings", icon: Settings }
] as const;

const commands = [
  "Create assignment",
  "Open this week's calendar",
  "Start focus mode",
  "Ask AI assistant",
  "Search resources",
  "Connect Canvas"
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const activeTitle = useMemo(() => {
    const allItems = [...navigation, ...utilityNavigation];
    return allItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? "Dashboard";
  }, [pathname]);

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <CommandPalette onOpenChange={setCommandOpen} open={commandOpen} />
      <MobileNavigation onOpenChange={setMobileOpen} open={mobileOpen} pathname={pathname} />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[176px] border-r border-zinc-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-[68px] items-center px-6">
          <Link
            className="text-[20px] font-bold leading-none tracking-normal text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            href="/dashboard"
          >
            chapters<span className="text-violet-600">.</span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col px-4 pb-5 pt-3">
          <div className="flex flex-col gap-2">
            {navigation.map((item) => (
              <NavItem item={item} key={item.href} pathname={pathname} />
            ))}
          </div>

          <div className="mt-8 border-t border-zinc-100 pt-4">
            {utilityNavigation.map((item) => (
              <NavItem item={item} key={item.href} pathname={pathname} />
            ))}
          </div>

          <ProfileMenu />
        </nav>
      </aside>

      <div className="min-h-screen lg:pl-[176px]">
        <header className="sticky top-0 z-20 h-[68px] border-b border-zinc-200 bg-white">
          <div className="flex h-full items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button
              aria-label="Open navigation"
              className="rounded-lg lg:hidden"
              onClick={() => setMobileOpen(true)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Menu />
            </Button>

            <p className="hidden min-w-28 text-[13px] font-semibold text-zinc-600 lg:block">{activeTitle}</p>

            <button
              className="mx-auto flex h-9 w-full max-w-[360px] items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 text-left text-[12px] text-zinc-500 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              onClick={() => setCommandOpen(true)}
              type="button"
            >
              <Search className="size-4 shrink-0 text-zinc-500" />
              <span className="truncate">Search anything...</span>
              <span className="ml-auto hidden items-center gap-1 text-[11px] font-medium text-zinc-500 sm:flex">
                <Command className="size-3" /> K
              </span>
            </button>

            <Button aria-label="Notifications" className="rounded-full" size="icon" type="button" variant="ghost">
              <Bell />
            </Button>
            <Button
              aria-label="Create"
              className="size-9 rounded-full bg-violet-600 text-white shadow-[0_8px_20px_rgba(109,61,242,0.28)] hover:bg-violet-700"
              size="icon"
              type="button"
            >
              <Plus />
            </Button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

function NavItem({
  item,
  pathname
}: {
  item: (typeof navigation)[number] | (typeof utilityNavigation)[number];
  pathname: string;
}) {
  const Icon = item.icon;
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-lg px-3 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
        isActive && "bg-violet-50 text-violet-700"
      )}
      href={item.href}
    >
      <Icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function ProfileMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="mt-auto flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          type="button"
        >
          <UserAvatar />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-zinc-900">{lockedUser.name}</span>
          <ChevronDown className="size-4 text-zinc-500" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          className="z-50 min-w-48 rounded-lg border border-zinc-200 bg-white p-2 text-[13px] shadow-[0_18px_44px_rgba(24,24,27,0.1)]"
          sideOffset={8}
        >
          <DropdownMenu.Label className="px-3 py-2">
            <div className="font-semibold text-zinc-950">{lockedUser.name}</div>
            <div className="text-[12px] text-zinc-500">Student workspace</div>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-zinc-100" />
          <DropdownMenu.Item className="rounded-md px-3 py-2 outline-none transition-colors hover:bg-zinc-50">
            Profile
          </DropdownMenu.Item>
          <DropdownMenu.Item className="rounded-md px-3 py-2 outline-none transition-colors hover:bg-zinc-50">
            Canvas
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className="rounded-md px-3 py-2 outline-none transition-colors hover:bg-zinc-50">
            <Link href="/settings">Settings</Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function UserAvatar() {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8057ff,#f2b078)] text-[10px] font-bold text-white">
      {lockedUser.initials}
    </span>
  );
}

function MobileNavigation({
  open,
  onOpenChange,
  pathname
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
}) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-sm lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-200 bg-white p-4 shadow-2xl lg:hidden">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Dialog.Title className="text-[20px] font-bold">
                chapters<span className="text-violet-600">.</span>
              </Dialog.Title>
              <Dialog.Description className="text-[12px] text-zinc-500">Student workspace</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button className="rounded-lg" size="icon" type="button" variant="ghost">
                <ChevronLeft />
              </Button>
            </Dialog.Close>
          </div>
          <nav className="flex flex-col gap-2">
            {[...navigation, ...utilityNavigation].map((item) => (
              <Dialog.Close asChild key={item.href}>
                <NavItem item={item} pathname={pathname} />
              </Dialog.Close>
            ))}
          </nav>
          <ProfileMenu />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CommandPalette({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-zinc-950/20 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(24,24,27,0.14)]">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
            <Search className="size-4 text-zinc-500" />
            <Input
              autoFocus
              className="h-10 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
              placeholder="Search anything..."
            />
          </div>
          <div className="p-2">
            {commands.map((command) => (
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[13px] font-medium text-zinc-800 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                key={command}
                type="button"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                  {command === "Ask AI assistant" ? <Bot className="size-4" /> : <BookOpen className="size-4" />}
                </span>
                {command}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
