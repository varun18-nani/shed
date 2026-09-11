"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import NotificationBell from "@/components/ui/NotificationBell";
import {
  Search,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  DoorOpen,
  Wand2,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Archive,
  Lock,
  Activity,
  Layers3,
} from "lucide-react";

type AdminDashboardStats = {
  departments: number;
  faculty: number;
  students: number;
  sections: number;
  subjects: number;
  rooms: number;
  timetableEntries: number;
  timetableStats: {
    draft: number;
    published: number;
    archived: number;
  };
  roomStats: {
    available: number;
    maintenance: number;
    unavailable: number;
  };
  sectionStats: {
    total: number;
    withPublishedTimetable: number;
    withoutPublishedTimetable: number;
  };
  recentActivity: Array<{
    id: string;
    subjectCode: string;
    subjectName: string;
    facultyName: string;
    roomNumber: string;
    sectionName: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    academicYear: string;
    updatedAt: string;
  }>;
};

export default function AdminPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard statistics");
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error("Dashboard stats error:", err);
      setError(err.message || "Unable to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar />

      <section className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-slate-950/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl w-96 border border-white/5">
            <Search size={18} className="text-gray-400" />
            <input
              placeholder="Search resources, faculty, students..."
              className="bg-transparent outline-none w-full text-white placeholder:text-gray-500 text-sm"
            />
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={fetchDashboardStats}
              title="Refresh Metrics"
              className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition"
            >
              <RefreshCw size={18} className={loading ? "animate-spin text-cyan-400" : ""} />
            </button>
            <NotificationBell />
            <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 h-10 w-10 rounded-full flex items-center justify-center font-bold shadow-lg shadow-cyan-500/20">
              A
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Institution Overview
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                College Academic Management & Live Resource Statistics
              </p>
            </div>
            <Link
              href="/admin/timetable"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 font-semibold text-xs text-white shadow-lg shadow-cyan-500/20 transition active:scale-95 self-start md:self-auto"
            >
              <Wand2 size={16} />
              <span>Timetable Generator</span>
            </Link>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-400 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={fetchDashboardStats} className="underline hover:text-white text-xs">
                Retry
              </button>
            </div>
          )}

          {/* Core Entity Statistics (6 cards) */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Academic Resources
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard
                title="Departments"
                value={stats ? stats.departments : "..."}
                icon={Building2}
                color="text-cyan-400"
                bg="bg-cyan-500/10"
                border="border-cyan-500/20"
                href="/admin/departments"
              />
              <StatCard
                title="Faculty"
                value={stats ? stats.faculty : "..."}
                icon={Users}
                color="text-emerald-400"
                bg="bg-emerald-500/10"
                border="border-emerald-500/20"
                href="/admin/faculty"
              />
              <StatCard
                title="Students"
                value={stats ? stats.students : "..."}
                icon={GraduationCap}
                color="text-blue-400"
                bg="bg-blue-500/10"
                border="border-blue-500/20"
                href="/admin/students"
              />
              <StatCard
                title="Sections"
                value={stats ? stats.sections : "..."}
                icon={Layers}
                color="text-purple-400"
                bg="bg-purple-500/10"
                border="border-purple-500/20"
                href="/admin/sections"
              />
              <StatCard
                title="Subjects"
                value={stats ? stats.subjects : "..."}
                icon={BookOpen}
                color="text-amber-400"
                bg="bg-amber-500/10"
                border="border-amber-500/20"
                href="/admin/subjects"
              />
              <StatCard
                title="Rooms"
                value={stats ? stats.rooms : "..."}
                icon={DoorOpen}
                color="text-rose-400"
                bg="bg-rose-500/10"
                border="border-rose-500/20"
                href="/admin/rooms"
              />
            </div>
          </div>

          {/* Timetable & Room Status Summaries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Timetable Status Summary */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Timetable Lifecycle Breakdown</h3>
                    <p className="text-xs text-slate-400">
                      Total {stats ? stats.timetableEntries : 0} scheduled class periods
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/timetable"
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                >
                  Manage <ArrowRight size={12} />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-yellow-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-yellow-400 font-semibold">
                    <Lock size={13} /> DRAFT
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stats ? stats.timetableStats.draft : "..."}
                  </div>
                  <div className="text-[11px] text-slate-500">Periods pending review</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 size={13} /> PUBLISHED
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stats ? stats.timetableStats.published : "..."}
                  </div>
                  <div className="text-[11px] text-slate-500">Live active schedules</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                    <Archive size={13} /> ARCHIVED
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stats ? stats.timetableStats.archived : "..."}
                  </div>
                  <div className="text-[11px] text-slate-500">Historical records</div>
                </div>
              </div>

              {/* Section Coverage */}
              {stats && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Layers3 size={14} className="text-cyan-400" /> Section Timetable Coverage:
                  </span>
                  <span className="font-semibold text-slate-200">
                    <strong className="text-emerald-400">{stats.sectionStats.withPublishedTimetable}</strong> /{" "}
                    {stats.sectionStats.total} Sections Published
                  </span>
                </div>
              )}
            </div>

            {/* Room Availability Status */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
                    <DoorOpen size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Room Facility Status</h3>
                    <p className="text-xs text-slate-400">
                      Total {stats ? stats.rooms : 0} classrooms & laboratories
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/rooms"
                  className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-medium"
                >
                  Manage <ArrowRight size={12} />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    AVAILABLE
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stats ? stats.roomStats.available : "..."}
                  </div>
                  <div className="text-[11px] text-slate-500">Ready for scheduling</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                    MAINTENANCE
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stats ? stats.roomStats.maintenance : "..."}
                  </div>
                  <div className="text-[11px] text-slate-500">Temporary repairs</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-red-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                    UNAVAILABLE
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stats ? stats.roomStats.unavailable : "..."}
                  </div>
                  <div className="text-[11px] text-slate-500">Locked / Out of use</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Navigation Actions */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Quick Management Hub
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              <QuickNavCard title="Faculty" icon={Users} href="/admin/faculty" color="from-emerald-500/20 to-teal-500/20" iconColor="text-emerald-400" />
              <QuickNavCard title="Students" icon={GraduationCap} href="/admin/students" color="from-blue-500/20 to-indigo-500/20" iconColor="text-blue-400" />
              <QuickNavCard title="Subjects" icon={BookOpen} href="/admin/subjects" color="from-amber-500/20 to-orange-500/20" iconColor="text-amber-400" />
              <QuickNavCard title="Rooms" icon={DoorOpen} href="/admin/rooms" color="from-rose-500/20 to-pink-500/20" iconColor="text-rose-400" />
              <QuickNavCard title="Sections" icon={Layers} href="/admin/sections" color="from-purple-500/20 to-fuchsia-500/20" iconColor="text-purple-400" />
              <QuickNavCard title="Time Slots" icon={Clock} href="/admin/timeslots" color="from-cyan-500/20 to-sky-500/20" iconColor="text-cyan-400" />
              <QuickNavCard title="Timetable" icon={CalendarDays} href="/admin/timetable" color="from-indigo-500/20 to-purple-500/20" iconColor="text-indigo-400" />
            </div>
          </div>

          {/* Recent Timetable Activity */}
          {stats && stats.recentActivity.length > 0 && (
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-base text-white">
                  <Activity size={18} className="text-cyan-400" />
                  <span>Recently Updated Timetable Entries</span>
                </div>
                <Link href="/admin/timetable" className="text-xs text-cyan-400 hover:underline">
                  View full schedule
                </Link>
              </div>

              <div className="divide-y divide-white/5">
                {stats.recentActivity.map((act) => (
                  <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">
                        {act.subjectName} ({act.subjectCode})
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        {act.facultyName} &bull; Room {act.roomNumber} &bull; Section {act.sectionName}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          act.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : act.status === "ARCHIVED"
                            ? "bg-slate-800 text-slate-400 border-slate-700"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        }`}
                      >
                        {act.status}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">{act.academicYear}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  border,
  href,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  bg: string;
  border: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`bg-slate-900 border ${border} rounded-2xl p-5 hover:border-cyan-400/40 hover:bg-slate-800/80 transition-all duration-300 shadow-lg flex flex-col justify-between group`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition">
          {title}
        </span>
        <div className={`p-2 rounded-xl ${bg} ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-3xl font-extrabold text-white mt-4">{value}</div>
    </Link>
  );
}

function QuickNavCard({
  title,
  icon: Icon,
  href,
  color,
  iconColor,
}: {
  title: string;
  icon: any;
  href: string;
  color: string;
  iconColor: string;
}) {
  return (
    <Link
      href={href}
      className="p-4 rounded-xl bg-slate-900 border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.03] transition flex flex-col items-center justify-center text-center gap-2 group shadow-md"
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
        <Icon className={iconColor} size={20} />
      </div>
      <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition">
        {title}
      </span>
    </Link>
  );
}