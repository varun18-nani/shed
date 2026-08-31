"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FacultySidebar from "@/components/layout/FacultySidebar";
import {
  CalendarDays,
  Clock,
  Building,
  GraduationCap,
  BookOpen,
  Layers,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Calendar,
} from "lucide-react";

type FacultyDashboardData = {
  faculty: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
  };
  metrics: {
    todayClassesCount: number;
    weeklyClassesCount: number;
    assignedSubjectsCount: number;
    assignedSectionsCount: number;
    totalTeachingHours: number;
  };
  todaySchedule: Array<{
    id: string;
    startTime: string;
    endTime: string;
    subjectCode: string;
    subjectName: string;
    sectionName: string;
    roomNumber: string;
    building: string;
    academicYear: string;
  }>;
  upcomingClasses: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectCode: string;
    subjectName: string;
    sectionName: string;
    roomNumber: string;
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

export default function FacultyPage() {
  const [data, setData] = useState<FacultyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFacultyDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/dashboard/faculty", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Please log in to access the dashboard");
        if (res.status === 403) throw new Error("Access restricted to faculty accounts");
        throw new Error("Failed to load faculty dashboard");
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
    fetchFacultyDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex">
      <FacultySidebar />

      <section className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-slate-950/60 backdrop-blur-md shrink-0">
          <div>
            <span className="text-xs text-emerald-400 font-mono font-semibold uppercase tracking-wider">
              Faculty Portal
            </span>
            <div className="text-base font-bold text-white">
              {data?.faculty ? `${data.faculty.name}` : "Faculty Dashboard"}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchFacultyDashboard}
              title="Refresh"
              className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition"
            >
              <RefreshCw size={18} className={loading ? "animate-spin text-emerald-400" : ""} />
            </button>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-500/20">
              {data?.faculty?.name?.charAt(0) || "F"}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Welcome, {data?.faculty?.name || "Professor"} 👋
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                {data?.faculty?.department || "Academic Department"} &bull; ID:{" "}
                {data?.faculty?.employeeId || "Faculty"}
              </p>
            </div>
            <Link
              href="/faculty/timetable"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 font-semibold text-xs text-white shadow-lg shadow-emerald-500/20 transition active:scale-95 self-start md:self-auto"
            >
              <CalendarDays size={16} />
              <span>View Full Timetable</span>
            </Link>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Faculty Metrics (5 cards) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Today's Classes"
              value={data ? data.metrics.todayClassesCount : "..."}
              icon={Clock}
              color="text-emerald-400"
              bg="bg-emerald-500/10"
              border="border-emerald-500/30"
            />
            <MetricCard
              title="Weekly Classes"
              value={data ? data.metrics.weeklyClassesCount : "..."}
              icon={Calendar}
              color="text-teal-400"
              bg="bg-teal-500/10"
              border="border-teal-500/30"
            />
            <MetricCard
              title="Assigned Subjects"
              value={data ? data.metrics.assignedSubjectsCount : "..."}
              icon={BookOpen}
              color="text-cyan-400"
              bg="bg-cyan-500/10"
              border="border-cyan-500/30"
            />
            <MetricCard
              title="Assigned Sections"
              value={data ? data.metrics.assignedSectionsCount : "..."}
              icon={Layers}
              color="text-purple-400"
              bg="bg-purple-500/10"
              border="border-purple-500/30"
            />
            <MetricCard
              title="Weekly Periods"
              value={data ? data.metrics.totalTeachingHours : "..."}
              icon={GraduationCap}
              color="text-amber-400"
              bg="bg-amber-500/10"
              border="border-amber-500/30"
            />
          </div>

          {/* Today's Schedule & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Schedule (2 cols) */}
            <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-base text-white">
                  <Clock size={18} className="text-emerald-400" />
                  <span>Today&apos;s Teaching Schedule</span>
                </div>
                <Link href="/faculty/timetable" className="text-xs text-emerald-400 hover:underline">
                  Weekly View
                </Link>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-500 text-sm">Loading schedule...</div>
              ) : !data || data.todaySchedule.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500/40 mb-2" />
                  <p className="font-semibold text-slate-300">No classes scheduled for today.</p>
                  <p className="text-xs text-slate-500 mt-0.5">Enjoy your free time or prepare for upcoming lectures.</p>
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
                          <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {c.subjectCode}
                          </span>
                          <span className="font-bold text-sm text-white">{c.subjectName}</span>
                        </div>
                        <div className="text-slate-400 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Building size={13} className="text-purple-400" /> Room {c.roomNumber} ({c.building})
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <GraduationCap size={13} className="text-cyan-400" /> Section {c.sectionName}
                          </span>
                        </div>
                      </div>
                      <div className="font-mono text-sm font-semibold text-emerald-400 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 self-start sm:self-auto">
                        {c.startTime} - {c.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions & Overview (1 col) */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="font-bold text-sm text-white">Quick Actions</h3>
                <div className="space-y-2.5">
                  <Link
                    href="/faculty/timetable"
                    className="p-3.5 rounded-xl bg-slate-950 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition flex items-center justify-between group text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <CalendarDays size={16} className="text-emerald-400" />
                      <span>My Complete Timetable</span>
                    </span>
                    <ArrowRight size={14} className="text-slate-500 group-hover:text-emerald-400 transition" />
                  </Link>
                </div>
              </div>

              {/* Status Note */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/20 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 size={16} /> Official Published Schedules Only
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Your portal displays active, conflict-validated teaching periods published by department administrators.
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