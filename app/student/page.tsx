"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StudentSidebar from "@/components/layout/StudentSidebar";
import {
  CalendarDays,
  Clock,
  Building,
  User,
  GraduationCap,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import NotificationBell from "@/components/ui/NotificationBell";

type StudentDashboardData = {
  student: {
    id: string;
    rollNumber: string;
    name: string;
    department: string;
    semester: number;
    section: string | null;
  };
  metrics: {
    todayClassesCount: number;
    weeklyClassesCount: number;
    totalWeeklyPeriods: number;
  };
  nextClass: {
    id: string;
    subjectCode: string;
    subjectName: string;
    facultyName: string;
    roomNumber: string;
    building: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isToday: boolean;
  } | null;
  todaySchedule: Array<{
    id: string;
    startTime: string;
    endTime: string;
    subjectCode: string;
    subjectName: string;
    facultyName: string;
    roomNumber: string;
    building: string;
  }>;
};

const DAY_MAPPING: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export default function StudentPage() {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStudentDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/dashboard/student", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Please log in to access the dashboard");
        if (res.status === 403) throw new Error("Access restricted to student accounts");
        throw new Error("Failed to load student dashboard");
      }

      const resData = await res.json();
      setData(resData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex">
      <StudentSidebar />

      <section className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-slate-950/60 backdrop-blur-md shrink-0">
          <div>
            <span className="text-xs text-blue-400 font-mono font-semibold uppercase tracking-wider">
              Student Portal
            </span>
            <div className="text-base font-bold text-white">
              {data?.student ? `${data.student.name}` : "Student Dashboard"}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchStudentDashboard}
              title="Refresh"
              className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition"
            >
              <RefreshCw size={18} className={loading ? "animate-spin text-blue-400" : ""} />
            </button>
            <NotificationBell />
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
              {data?.student?.name?.charAt(0) || "S"}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Hi, {data?.student?.name || "Student"} 👋
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                {data?.student?.department} &bull; Semester {data?.student?.semester} &bull; Section{" "}
                {data?.student?.section || "Unassigned"} &bull; Roll: {data?.student?.rollNumber}
              </p>
            </div>
            <Link
              href="/student/timetable"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 font-semibold text-xs text-white shadow-lg shadow-blue-500/20 transition active:scale-95 self-start md:self-auto"
            >
              <CalendarDays size={16} />
              <span>Full Class Timetable</span>
            </Link>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* NEXT CLASS HERO BANNER */}
          <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-blue-500/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 tracking-wider uppercase">
                  <Sparkles size={16} />
                  <span>Next Upcoming Lecture</span>
                  {data?.nextClass && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px]">
                      {data.nextClass.isToday ? "Today" : DAY_MAPPING[data.nextClass.dayOfWeek]}
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="text-slate-400 text-sm py-4">Checking upcoming schedule...</div>
                ) : !data || !data.nextClass ? (
                  <div className="py-2">
                    <h2 className="text-xl font-bold text-white">No upcoming classes</h2>
                    <p className="text-slate-400 text-xs mt-1">
                      You are all caught up or your section timetable is not yet published.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {data.nextClass.subjectCode}
                      </span>
                      <h2 className="text-2xl font-bold text-white tracking-tight">
                        {data.nextClass.subjectName}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
                      <span className="flex items-center gap-1.5 font-medium">
                        <User size={14} className="text-cyan-400" /> {data.nextClass.facultyName}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1.5">
                        <Building size={14} className="text-purple-400" /> Room {data.nextClass.roomNumber} (
                        {data.nextClass.building})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {data?.nextClass && (
                <div className="flex flex-col sm:items-end justify-center bg-black/40 border border-white/10 px-6 py-4 rounded-2xl shrink-0 self-start md:self-auto">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Scheduled Time
                  </span>
                  <div className="text-xl font-mono font-bold text-cyan-400 mt-0.5">
                    {data.nextClass.startTime} - {data.nextClass.endTime}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metrics (3 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title="Today's Classes"
              value={data ? data.metrics.todayClassesCount : "..."}
              icon={Clock}
              color="text-blue-400"
              bg="bg-blue-500/10"
              border="border-blue-500/30"
            />
            <MetricCard
              title="Weekly Classes"
              value={data ? data.metrics.weeklyClassesCount : "..."}
              icon={Calendar}
              color="text-indigo-400"
              bg="bg-indigo-500/10"
              border="border-indigo-500/30"
            />
            <MetricCard
              title="Weekly Credit Periods"
              value={data ? data.metrics.totalWeeklyPeriods : "..."}
              icon={GraduationCap}
              color="text-cyan-400"
              bg="bg-cyan-500/10"
              border="border-cyan-500/30"
            />
          </div>

          {/* Today's Schedule & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Schedule (2 cols) */}
            <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-base text-white">
                  <Clock size={18} className="text-blue-400" />
                  <span>Today&apos;s Class Schedule</span>
                </div>
                <Link href="/student/timetable" className="text-xs text-blue-400 hover:underline">
                  Full Week
                </Link>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-500 text-sm">Loading schedule...</div>
              ) : !data || data.todaySchedule.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <CheckCircle2 size={32} className="mx-auto text-blue-500/40 mb-2" />
                  <p className="font-semibold text-slate-300">No classes scheduled for today.</p>
                  <p className="text-xs text-slate-500 mt-0.5">Enjoy your day off or review past course materials.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 space-y-2">
                  {data.todaySchedule.map((c) => (
                    <div
                      key={c.id}
                      className="pt-3 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {c.subjectCode}
                          </span>
                          <span className="font-bold text-sm text-white">{c.subjectName}</span>
                        </div>
                        <div className="text-slate-400 flex items-center gap-3">
                          <span className="flex items-center gap-1 font-medium text-slate-300">
                            <User size={13} className="text-cyan-400" /> {c.facultyName}
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <Building size={13} className="text-purple-400" /> Room {c.roomNumber} ({c.building})
                          </span>
                        </div>
                      </div>
                      <div className="font-mono text-sm font-semibold text-blue-400 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 self-start sm:self-auto">
                        {c.startTime} - {c.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions & Section Info (1 col) */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="font-bold text-sm text-white">Quick Actions</h3>
                <div className="space-y-2.5">
                  <Link
                    href="/student/timetable"
                    className="p-3.5 rounded-xl bg-slate-950 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition flex items-center justify-between group text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <CalendarDays size={16} className="text-blue-400" />
                      <span>View My Section Timetable</span>
                    </span>
                    <ArrowRight size={14} className="text-slate-500 group-hover:text-blue-400 transition" />
                  </Link>
                </div>
              </div>

              {/* Verified Section Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-500/20 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-300">
                  <CheckCircle2 size={16} /> Verified Section Schedule
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Your timetable is automatically synced with Section <strong>{data?.student?.section || "A"}</strong> and only displays official published periods.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  border,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div className={`bg-slate-900 border ${border} rounded-2xl p-5 shadow-lg flex flex-col justify-between`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">{title}</span>
        <div className={`p-2 rounded-xl ${bg} ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-3xl font-extrabold text-white mt-3">{value}</div>
    </div>
  );
}