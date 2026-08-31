"use client";

import { useEffect, useState } from "react";
import QuickActions from "@/components/dashboard/QuickActions";
import Sidebar from "@/components/layout/Sidebar";
import { Bell, Search } from "lucide-react";

type DashboardStats = {
  faculty: number;
  students: number;
  departments: number;
  rooms: number;
  subjects: number;
  timetableEntries: number;
};

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats>({
    faculty: 0,
    students: 0,
    departments: 0,
    rooms: 0,
    subjects: 0,
    timetableEntries: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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

        setStats({
          faculty: data.faculty ?? 0,
          students: data.students ?? 0,
          departments: data.departments ?? 0,
          rooms: data.rooms ?? 0,
          subjects: data.subjects ?? 0,
          timetableEntries: data.timetableEntries ?? 0,
        });
      } catch (error) {
        console.error("Dashboard stats error:", error);
        setError("Unable to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar />

      {/* Main Content */}
      <section className="flex-1">
        {/* Topbar */}
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8">
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl w-96">
            <Search size={18} className="text-gray-300" />

            <input
              placeholder="Search..."
              className="bg-transparent outline-none w-full text-white placeholder:text-gray-400"
            />
          </div>

          <div className="flex items-center gap-6">
            <Bell className="text-white" />

            <div className="bg-cyan-500 h-10 w-10 rounded-full flex items-center justify-center font-semibold">
              A
            </div>
          </div>
        </header>

        {/* Dashboard */}
        <div className="p-8">
          <h1 className="text-4xl font-bold">
            Welcome Back 👋
          </h1>

          <p className="text-gray-400 mt-2">
            College Academic Management Dashboard
          </p>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-400">
              {error}
            </div>
          )}

          {/* Statistics Cards */}
          <div className="grid md:grid-cols-4 gap-6 mt-10">
            <Card
              title="Faculty"
              value={loading ? "..." : String(stats.faculty)}
            />

            <Card
              title="Students"
              value={loading ? "..." : String(stats.students)}
            />

            <Card
              title="Departments"
              value={loading ? "..." : String(stats.departments)}
            />

            <Card
              title="Rooms"
              value={loading ? "..." : String(stats.rooms)}
            />
          </div>

          {/* Quick Actions */}
          <QuickActions />
        </div>
      </section>
    </main>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl p-7">
      <p className="text-gray-400 text-lg">
        {title}
      </p>

      <p className="text-4xl font-bold mt-5">
        {value}
      </p>
    </div>
  );
}