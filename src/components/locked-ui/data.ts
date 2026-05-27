export type AssignmentPriority = "High" | "Medium" | "Low";
export type AssignmentStatus = "upcoming" | "completed";
export type EventTone = "purple" | "blue" | "orange" | "neutral";
export type ResourceFileType = "pdf" | "docx" | "image" | "link";

export type LockedAssignmentRow = {
  id: string;
  title: string;
  course: string;
  owner: string;
  priority: AssignmentPriority;
  dueLabel: string;
  dueDate: string;
  dueBucket?: "today" | "week" | "later" | "none" | "overdue";
  priorityScore?: number;
  source?: "canvas" | "manual";
  status: AssignmentStatus;
  accent: string;
};

export type LockedWeekDay = {
  active: boolean;
  badge?: string;
  label: string;
};

export type LockedAllDayEvent = {
  dayIndex: number;
  id: string;
  kind?: "assignment" | "canvas" | "manual" | "study";
  startsAt?: string;
  title: string;
  tone: EventTone;
};

export type LockedCalendarEvent = {
  dayIndex: number;
  endHour: number;
  endsAt?: string;
  id: string;
  kind?: "assignment" | "canvas" | "manual" | "study";
  startHour: number;
  startsAt?: string;
  time: string;
  title: string;
  tone: EventTone;
};

export type LockedFocusSession = {
  complete: boolean;
  id: string;
  minutes: string;
  time: string;
};

export type LockedResourceFolder = {
  id: string;
  items: string;
  title: string;
};

export type LockedResourceFile = {
  date: string;
  id: string;
  meta: string;
  title: string;
  type: ResourceFileType;
};

export type LockedDashboardCard = {
  helper: string;
  label: string;
  value: string;
};

export const lockedUser = {
  name: "Alex Chen",
  initials: "AC"
};

export const lockedCourses = [
  {
    id: "ap-calculus",
    name: "AP Calculus BC",
    teacher: "Mr. Peterson",
    color: "#6d3df2"
  },
  {
    id: "ap-statistics",
    name: "AP Statistics",
    teacher: "Mrs. Brown",
    color: "#8157ff"
  },
  {
    id: "physics",
    name: "Physics",
    teacher: "Ms. Lee",
    color: "#7c4dff"
  },
  {
    id: "deca",
    name: "DECA",
    teacher: "Team Project",
    color: "#ff7a1a"
  },
  {
    id: "english",
    name: "English",
    teacher: "Ms. Johnson",
    color: "#98a2b3"
  },
  {
    id: "robotics",
    name: "Robotics",
    teacher: "Club",
    color: "#667085"
  }
] as const;

export const assignmentRows = [
  {
    id: "calc-problem-set",
    title: "AP Calculus BC - Problem Set",
    course: "Math",
    owner: "Mr. Peterson",
    priority: "High" as AssignmentPriority,
    dueLabel: "Due in 2 days",
    dueDate: "May 15, 11:59 PM",
    status: "upcoming" as AssignmentStatus,
    accent: "purple"
  },
  {
    id: "deca-pitch",
    title: "DECA Pitch Practice",
    course: "DECA",
    owner: "Team Project",
    priority: "Medium" as AssignmentPriority,
    dueLabel: "Due in 3 days",
    dueDate: "May 16, 11:59 PM",
    status: "upcoming" as AssignmentStatus,
    accent: "orange"
  },
  {
    id: "physics-lab-report",
    title: "Physics Lab Report",
    course: "Physics",
    owner: "Ms. Lee",
    priority: "High" as AssignmentPriority,
    dueLabel: "Due in 5 days",
    dueDate: "May 18, 11:59 PM",
    status: "upcoming" as AssignmentStatus,
    accent: "purple"
  },
  {
    id: "english-essay",
    title: "English Essay Draft",
    course: "English",
    owner: "Ms. Johnson",
    priority: "Low" as AssignmentPriority,
    dueLabel: "Due in 1 week",
    dueDate: "May 22, 11:59 PM",
    status: "upcoming" as AssignmentStatus,
    accent: "slate"
  },
  {
    id: "stats-review",
    title: "AP Statistics Chapter 4 Review",
    course: "Stats",
    owner: "Mrs. Brown",
    priority: "Medium" as AssignmentPriority,
    dueLabel: "Submitted",
    dueDate: "May 9, 9:00 PM",
    status: "completed" as AssignmentStatus,
    accent: "purple"
  }
] as const;

export const weekDays = [
  { label: "Mon 12", active: false },
  { label: "Tue 13", active: true },
  { label: "Wed 14", active: false },
  { label: "Thu 15", active: false },
  { label: "Fri 16", active: false },
  { label: "Sat 17", active: false },
  { label: "Sun 18", active: false }
] as const;

export const allDayEvents = [
  {
    id: "fun-run",
    dayIndex: 0,
    title: "AP Exam: 8am",
    tone: "neutral" as EventTone
  },
  {
    id: "deca-event",
    dayIndex: 4,
    title: "DECA Event",
    tone: "purple" as EventTone
  }
] as const;

export const calendarEvents = [
  {
    id: "stats",
    dayIndex: 1,
    title: "AP Statistics",
    time: "8:00 - 9:30 AM",
    startHour: 8,
    endHour: 9.5,
    tone: "purple" as EventTone
  },
  {
    id: "calculus",
    dayIndex: 3,
    title: "AP Calculus BC",
    time: "10:00 - 11:30 AM",
    startHour: 10,
    endHour: 11.5,
    tone: "blue" as EventTone
  },
  {
    id: "physics",
    dayIndex: 0,
    title: "Physics",
    time: "12:00 - 1:00 PM",
    startHour: 12,
    endHour: 13,
    tone: "purple" as EventTone
  },
  {
    id: "lunch",
    dayIndex: 2,
    title: "Lunch",
    time: "12:00 - 1:00 PM",
    startHour: 12,
    endHour: 13,
    tone: "neutral" as EventTone
  },
  {
    id: "robotics",
    dayIndex: 1,
    title: "Robotics Club",
    time: "1:00 - 2:30 PM",
    startHour: 13,
    endHour: 14.5,
    tone: "purple" as EventTone
  },
  {
    id: "study",
    dayIndex: 2,
    title: "Study Session",
    time: "3:30 - 5:00 PM",
    startHour: 15.5,
    endHour: 17,
    tone: "purple" as EventTone
  }
] as const;

export const focusSessions = [
  { id: "session-1", time: "1:00 PM - 1:50 PM", minutes: "50m", complete: true },
  { id: "session-2", time: "10:00 AM - 10:50 AM", minutes: "50m", complete: true },
  { id: "session-3", time: "9:00 AM - 9:45 AM", minutes: "45m", complete: false }
] as const;

export const focusBars = [28, 48, 39, 55, 35, 72, 18] as const;

export const assistantActions = [
  {
    id: "explain",
    title: "Explain a concept",
    description: "Break down complex topics"
  },
  {
    id: "quiz",
    title: "Quiz me",
    description: "Test your knowledge"
  },
  {
    id: "study",
    title: "Study plan",
    description: "Create a personalized plan"
  },
  {
    id: "summarize",
    title: "Summarize notes",
    description: "Get key points"
  },
  {
    id: "essay",
    title: "Essay feedback",
    description: "Improve your writing"
  },
  {
    id: "practice",
    title: "Practice problems",
    description: "Get step-by-step help"
  }
] as const;

export const resourceFolders = [
  { id: "calculus", title: "AP Calculus BC", items: "12 items" },
  { id: "statistics", title: "AP Statistics", items: "8 items" },
  { id: "physics", title: "Physics", items: "15 items" },
  { id: "robotics", title: "Robotics", items: "9 items" }
] as const;

export const resourceFiles = [
  {
    id: "formula-sheet",
    title: "AP Calculus Formula Sheet.pdf",
    type: "pdf" as ResourceFileType,
    meta: "PDF - 1.2 MB",
    date: "May 10, 2025"
  },
  {
    id: "chapter-notes",
    title: "Stats Chapter 4 Notes.pdf",
    type: "pdf" as ResourceFileType,
    meta: "PDF - 890 KB",
    date: "May 9, 2025"
  },
  {
    id: "review",
    title: "Physics Unit 3 Review.docx",
    type: "docx" as ResourceFileType,
    meta: "DOCX - 156 KB",
    date: "May 8, 2025"
  },
  {
    id: "proposal",
    title: "Robotics Proposal.pdf",
    type: "pdf" as ResourceFileType,
    meta: "PDF - 2.4 MB",
    date: "May 7, 2025"
  },
  {
    id: "study-plan",
    title: "Study Plan Template.pdf",
    type: "pdf" as ResourceFileType,
    meta: "PDF - 612 KB",
    date: "May 6, 2025"
  }
] as const;

export const dashboardCards = [
  { label: "Due soon", value: "4", helper: "2 high priority" },
  { label: "Focus time", value: "2h 15m", helper: "This week" },
  { label: "Resources", value: "44", helper: "Across 4 folders" },
  { label: "Canvas sync", value: "Ready", helper: "Token setup" }
] as const;
