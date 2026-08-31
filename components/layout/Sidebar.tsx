"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  CalendarDays,
  Settings,
  LogOut,
  Clock,
} from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Faculty",
    href: "/admin/faculty",
    icon: Users,
  },
  {
    name: "Students",
    href: "/admin/students",
    icon: GraduationCap,
  },
  {
    name: "Subjects",
    href: "/admin/subjects",
    icon: BookOpen,
  },
  {
    name: "Rooms",
    href: "/admin/rooms",
    icon: Building2,
  },
  {
    name: "Time Slots",
    href: "/admin/timeslots",
    icon: Clock,
  },
  {
    name: "Timetable",
    href: "/admin/timetable",
    icon: CalendarDays,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
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
      <nav className="mt-8 space-y-2 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                active
                  ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5 w-full text-left"
        >
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}