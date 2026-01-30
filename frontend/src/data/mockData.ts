// =====================
// Types
// =====================

export type Course = {
  id: number;
  title: string;
  rating: number;
  lessons: number;
  type: "Free" | "Premium";
};

export type Stat = {
  label: string;
  value: number;
};

export type OngoingCourse = {
  title: string;
  progress: number;
};

export type Assignment = {
  title: string;
  status: "Pending" | "Completed";
};

export type Coach = {
  id: number;
  name: string;
};

export type CoachMetric = {
  metric: string;
  value: number;
};

export type MonthlySession = {
  month: string;
  sessions: number;
};

export type TrackEvidence = {
  subject: string;
  value: number;
};

export type CalendarDay = {
  day: number;
  coach: string;
  student: string;
  date: string;
};

// =====================
// Data
// =====================

export const courses: Course[] = [
  { id: 1, title: "UI Design Fundamentals", rating: 4.8, lessons: 24, type: "Free" },
  { id: 2, title: "Advanced React", rating: 4.9, lessons: 32, type: "Free" },
  { id: 3, title: "Product Thinking", rating: 4.6, lessons: 18, type: "Free" },
  { id: 4, title: "Premium Leadership Program", rating: 5.0, lessons: 40, type: "Premium" }
];

export const stats: Stat[] = [
  { label: "Completed Sessions", value: 14 },
  { label: "Monthly Hours", value: 9 },
  { label: "Progress Reviews", value: 0 },
  { label: "Cancelled Sessions", value: 2 },
  { label: "Overdue Marking", value: 74 }
];

export const ongoingCourses: OngoingCourse[] = [
  { title: "UX Research", progress: 65 },
  { title: "Frontend Architecture", progress: 40 }
];

export const assignments: Assignment[] = [
  { title: "Dashboard Redesign", status: "Pending" },
  { title: "User Flow Audit", status: "Completed" }
];

export const coaches: Coach[] = [
  { id: 1, name: "Sarah Johnson" },
  { id: 2, name: "Michael Lee" },
  { id: 3, name: "Emma Wilson" }
];

export const coachMetrics: Record<number, CoachMetric[]> = {
  1: [
    { metric: "Sessions", value: 12 },
    { metric: "Students", value: 5 },
    { metric: "Rating", value: 4.7 }
  ],
  2: [
    { metric: "Sessions", value: 8 },
    { metric: "Students", value: 3 },
    { metric: "Rating", value: 4.5 }
  ],
  3: [
    { metric: "Sessions", value: 15 },
    { metric: "Students", value: 7 },
    { metric: "Rating", value: 4.9 }
  ]
};

export const monthlySessions: MonthlySession[] = [
  { month: "Jan", sessions: 4 },
  { month: "Feb", sessions: 6 },
  { month: "Mar", sessions: 9 },
  { month: "Apr", sessions: 7 }
];

export const trackEvidences: TrackEvidence[] = [
  { subject: "Attendance", value: 80 },
  { subject: "Participation", value: 70 },
  { subject: "Assignments", value: 90 },
  { subject: "Feedback", value: 60 }
];

export const calendarDays: CalendarDay[] = [
  { day: 3, coach: "Sarah Johnson", student: "Ali Ahmed", date: "2026-01-03" },
  { day: 8, coach: "Michael Lee", student: "Mona Khaled", date: "2026-01-08" },
  { day: 15, coach: "Emma Wilson", student: "Omar Hassan", date: "2026-01-15" }
];
