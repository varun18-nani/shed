"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  LogOut,
  GraduationCap,
} from "lucide-react";

const facultyMenuItems = [
  {
    name: "Dashboard",
    href: "/faculty",
    icon: LayoutDashboard,
  },
  {
    name: "My Timetable",
    href: "/faculty/timetable",
    icon: CalendarDays,
  },
];

export default function FacultySidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <aside className="w-72 min-h-screen bg-slate-900 border-r border-white/10 p-6 flex flex-col">
      <div className="flex items-center gap-3 px-2 mb-4">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20">
          F
        </div>
        <div>
          <h1 className="text-base font-bold text-white leading-tight">Faculty Portal</h1>
          <p className="text-xs text-slate-400">SchedAI Platform</p>
        </div>
      </div>

      <nav className="mt-6 space-y-2 flex-1">
        {facultyMenuItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium ${
                active
                  ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5 w-full text-left text-sm font-medium"
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
