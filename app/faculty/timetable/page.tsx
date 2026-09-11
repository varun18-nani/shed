"use client";

import { useEffect, useState, useMemo } from "react";
import FacultySidebar from "@/components/layout/FacultySidebar";
import {
  CalendarDays,
  Clock,
  Building,
  GraduationCap,
  Download,
  Printer,
  Filter,
  RefreshCw,
  Search,
  X,
  User,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import NotificationBell from "@/components/ui/NotificationBell";

const DAY_MAPPING: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

type FacultyProfile = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  departmentCode: string;
};

type TimetableEntry = {
  id: string;
  subject: { id: string; code: string; name: string; credits: number; semester: number };
  faculty: { id: string; employeeId: string; name: string };
  room: { id: string; roomNumber: string; building: string; type: string };
  timeSlot: { id: string; dayOfWeek: number; startTime: string; endTime: string };
  section: { id: string; name: string; semester: number; department: string } | null;
  status: "PUBLISHED";
  academicYear: string;
};

export default function FacultyTimetablePage() {
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  async function loadTimetable() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/faculty/timetable");
      if (!res.ok) {
        if (res.status === 401) throw new Error("Please log in to view your timetable");
        if (res.status === 403) throw new Error("Access restricted to faculty accounts");
        throw new Error("Failed to load timetable");
      }
      const data = await res.json();
      setProfile(data.faculty || null);
      setEntries(data.entries || []);
    } catch (err: any) {
      setError(err.message || "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTimetable();
  }, []);

  // Filter options derived dynamically from authorized data
  const availableYears = useMemo(() => Array.from(new Set(entries.map((e) => e.academicYear))), [entries]);
  const availableSemesters = useMemo(
    () => Array.from(new Set(entries.map((e) => e.subject.semester))).sort((a, b) => a - b),
    [entries]
  );
  const availableSections = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .filter((e) => e.section)
            .map((e) => JSON.stringify({ id: e.section!.id, name: e.section!.name }))
        )
      ).map((str) => JSON.parse(str)),
    [entries]
  );
  const availableSubjects = useMemo(
    () =>
      Array.from(
        new Set(entries.map((e) => JSON.stringify({ id: e.subject.id, code: e.subject.code, name: e.subject.name })))
      ).map((str) => JSON.parse(str)),
    [entries]
  );

  // Filtered timetable entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.subject.code.toLowerCase().includes(q) ||
        e.subject.name.toLowerCase().includes(q) ||
        e.room.roomNumber.toLowerCase().includes(q) ||
        (e.section?.name.toLowerCase().includes(q) ?? false);

      const matchYear = !filterYear || e.academicYear === filterYear;
      const matchDay = !filterDay || e.timeSlot.dayOfWeek.toString() === filterDay;
      const matchSemester = !filterSemester || e.subject.semester.toString() === filterSemester;
      const matchSection = !filterSection || e.section?.id === filterSection;
      const matchSubject = !filterSubject || e.subject.id === filterSubject;

      return matchSearch && matchYear && matchDay && matchSemester && matchSection && matchSubject;
    });
  }, [entries, search, filterYear, filterDay, filterSemester, filterSection, filterSubject]);

  // Unique sorted timeslots and active days
  const activeDays = useMemo(() => {
    const days = Array.from(new Set(entries.map((e) => e.timeSlot.dayOfWeek))).sort((a, b) => a - b);
    return days.length > 0 ? days : [1, 2, 3, 4, 5];
  }, [entries]);

  const uniqueTimeSlotRanges = useMemo(() => {
    const map = new Map<string, { startTime: string; endTime: string }>();
    entries.forEach((e) => {
      const key = `${e.timeSlot.startTime}-${e.timeSlot.endTime}`;
      if (!map.has(key)) {
        map.set(key, { startTime: e.timeSlot.startTime, endTime: e.timeSlot.endTime });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [entries]);

  const gridEntriesMap = useMemo(() => {
    const map = new Map<string, TimetableEntry[]>();
    filteredEntries.forEach((entry) => {
      const key = `${entry.timeSlot.dayOfWeek}_${entry.timeSlot.startTime}_${entry.timeSlot.endTime}`;
      const list = map.get(key) || [];
      list.push(entry);
      map.set(key, list);
    });
    return map;
  }, [filteredEntries]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredEntries.length === 0) return;

    const headers = [
      "Day",
      "Start Time",
      "End Time",
      "Subject Code",
      "Subject Name",
      "Room",
      "Building",
      "Section",
      "Semester",
      "Academic Year",
    ];

    const escapeCSV = (val: any) => {
      const str = String(val ?? "").trim();
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredEntries.map((e) => [
      escapeCSV(DAY_MAPPING[e.timeSlot.dayOfWeek] || `Day ${e.timeSlot.dayOfWeek}`),
      escapeCSV(e.timeSlot.startTime),
      escapeCSV(e.timeSlot.endTime),
      escapeCSV(e.subject.code),
      escapeCSV(e.subject.name),
      escapeCSV(e.room.roomNumber),
      escapeCSV(e.room.building),
      escapeCSV(e.section ? e.section.name : "None"),
      escapeCSV(e.subject.semester),
      escapeCSV(e.academicYear),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `faculty-timetable-${profile?.employeeId || "schedule"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar hidden when printing */}
      <div className="print:hidden">
        <FacultySidebar />
      </div>

      <section className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        {/* TOPBAR (Hidden in Print) */}
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 shrink-0 bg-slate-950/60 backdrop-blur-md print:hidden">
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl w-80 border border-white/5">
            <Search size={18} className="text-gray-400" />
            <input
              placeholder="Search classes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-white placeholder-gray-500 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-500 hover:text-gray-300">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={loadTimetable}
              title="Refresh Timetable"
              className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition"
            >
              <RefreshCw size={18} className={loading ? "animate-spin text-emerald-400" : ""} />
            </button>
            <NotificationBell />
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right text-xs">
                <div className="font-bold text-white">{profile?.name || "Faculty Member"}</div>
                <div className="text-slate-400">{profile?.department || "Department"}</div>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-500/20">
                {profile?.name?.charAt(0) || "F"}
              </div>
            </div>
          </div>
        </header>

        {/* PRINT EXCLUSIVE HEADER */}
        <div className="hidden print:block p-6 mb-4 border-b-2 border-slate-800 text-black">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Faculty Schedule</h1>
              <p className="text-sm text-slate-600 mt-0.5">Official SchedAI Teaching Timetable</p>
            </div>
            <div className="text-right text-sm text-slate-700">
              <div>
                <strong>Faculty:</strong> {profile?.name} ({profile?.employeeId})
              </div>
              <div>
                <strong>Department:</strong> {profile?.department}
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar space-y-6 print:p-0 print:overflow-visible">
          {/* HEADER & ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <CalendarDays className="text-emerald-400" size={30} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  My Teaching Timetable
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Official Published
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {profile ? `${profile.name} (${profile.employeeId}) &bull; ${profile.department}` : "Faculty schedule"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                disabled={filteredEntries.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition active:scale-95 disabled:opacity-40"
              >
                <Download size={15} className="text-emerald-400" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => window.print()}
                disabled={filteredEntries.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition active:scale-95 disabled:opacity-40"
              >
                <Printer size={15} className="text-purple-400" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* FILTERS */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-xl space-y-3 print:hidden">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-emerald-400" />
                <span>Filter Schedule</span>
                <span className="text-slate-500 font-normal">
                  ({filteredEntries.length} {filteredEntries.length === 1 ? "period" : "periods"})
                </span>
              </div>
              {(filterYear || filterDay || filterSemester || filterSection || filterSubject || search) && (
                <button
                  onClick={() => {
                    setFilterYear("");
                    setFilterDay("");
                    setFilterSemester("");
                    setFilterSection("");
                    setFilterSubject("");
                    setSearch("");
                  }}
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 text-slate-300"
              >
                <option value="">All Academic Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>

              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 text-slate-300"
              >
                <option value="">All Days</option>
                {Object.entries(DAY_MAPPING).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>

              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 text-slate-300"
              >
                <option value="">All Semesters</option>
                {availableSemesters.map((sem) => (
                  <option key={sem} value={sem.toString()}>
                    Semester {sem}
                  </option>
                ))}
              </select>

              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 text-slate-300"
              >
                <option value="">All Sections</option>
                {availableSections.map((sec: any) => (
                  <option key={sec.id} value={sec.id}>
                    Section {sec.name}
                  </option>
                ))}
              </select>

              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 text-slate-300"
              >
                <option value="">All Subjects</option>
                {availableSubjects.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TIMETABLE GRID */}
          {loading ? (
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-16 text-center text-gray-400 shadow-xl">
              <RefreshCw size={32} className="mx-auto text-emerald-400 animate-spin mb-4" />
              <p className="text-sm font-medium">Loading your timetable schedule...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-16 text-center shadow-xl print:bg-transparent print:border-none">
              <CalendarDays size={48} className="mx-auto text-slate-700 mb-4" />
              <p className="text-gray-300 text-base font-medium print:text-black">
                {entries.length === 0
                  ? "No published timetable is available for you yet."
                  : "No classes match the selected filters."}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {entries.length === 0
                  ? "Your academic administrator has not published a schedule for this period."
                  : "Try clearing active filters to view all classes."}
              </p>
            </div>
          ) : (
            <div className="space-y-6 print:space-y-4">
              {activeDays
                .filter((day) => !filterDay || day.toString() === filterDay)
                .map((dayNum) => {
                  const dayName = DAY_MAPPING[dayNum] || `Day ${dayNum}`;
                  const dayHasEntries = uniqueTimeSlotRanges.some((slot) => {
                    const key = `${dayNum}_${slot.startTime}_${slot.endTime}`;
                    return (gridEntriesMap.get(key) || []).length > 0;
                  });

                  if (!dayHasEntries && (filterSemester || filterSection || filterSubject || search)) {
                    return null;
                  }

                  return (
                    <div
                      key={dayNum}
                      className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl print:bg-white print:border-slate-300 print:text-black"
                    >
                      <div className="bg-slate-800/80 px-6 py-3 border-b border-white/10 flex items-center justify-between print:bg-slate-100 print:border-slate-300">
                        <div className="flex items-center gap-2.5">
                          <Clock size={16} className="text-emerald-400 print:text-slate-800" />
                          <h3 className="text-sm font-bold text-white print:text-slate-900 tracking-wide">
                            {dayName}
                          </h3>
                        </div>
                        <span className="text-xs font-medium text-slate-400 print:text-slate-600">
                          {
                            uniqueTimeSlotRanges.reduce((acc, slot) => {
                              const key = `${dayNum}_${slot.startTime}_${slot.endTime}`;
                              return acc + (gridEntriesMap.get(key)?.length || 0);
                            }, 0)
                          }{" "}
                          classes
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider print:bg-slate-50 print:text-slate-700 print:border-slate-200">
                              <th className="px-5 py-3 text-left w-40">Time Slot</th>
                              <th className="px-5 py-3 text-left">Class Information</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 print:divide-slate-200">
                            {uniqueTimeSlotRanges.map((slot, idx) => {
                              const key = `${dayNum}_${slot.startTime}_${slot.endTime}`;
                              const cellEntries = gridEntriesMap.get(key) || [];

                              return (
                                <tr key={idx} className="hover:bg-white/[0.015] transition-colors">
                                  <td className="px-5 py-4 align-top w-40">
                                    <div className="font-mono text-sm font-semibold text-emerald-400 print:text-slate-900">
                                      {slot.startTime} - {slot.endTime}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">Period {idx + 1}</div>
                                  </td>
                                  <td className="px-5 py-4">
                                    {cellEntries.length === 0 ? (
                                      <div className="text-xs text-slate-600 italic py-2 print:text-slate-400">
                                        Free period
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {cellEntries.map((entry) => (
                                          <div
                                            key={entry.id}
                                            className="bg-slate-950/80 border border-white/10 rounded-xl p-4 shadow-lg print:bg-white print:border-slate-300 print:shadow-none space-y-2.5"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div>
                                                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                                                  {entry.subject.code}
                                                </span>
                                                <h4 className="font-bold text-sm text-white print:text-slate-900 mt-1.5">
                                                  {entry.subject.name}
                                                </h4>
                                              </div>
                                              <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                                                {entry.subject.credits} Credits
                                              </span>
                                            </div>

                                            <div className="space-y-1 text-xs text-slate-300 print:text-slate-700">
                                              <div className="flex items-center gap-1.5">
                                                <Building size={13} className="text-purple-400 shrink-0" />
                                                <span>
                                                  Room:{" "}
                                                  <strong className="text-slate-200 print:text-slate-900">
                                                    {entry.room.roomNumber}
                                                  </strong>{" "}
                                                  ({entry.room.building})
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1.5">
                                                <GraduationCap size={13} className="text-cyan-400 shrink-0" />
                                                <span>
                                                  Section:{" "}
                                                  <strong className="text-slate-200 print:text-slate-900">
                                                    {entry.section ? entry.section.name : "All"}
                                                  </strong>{" "}
                                                  (Semester {entry.subject.semester})
                                                </span>
                                              </div>
                                            </div>

                                            <div className="pt-2 border-t border-white/5 print:border-slate-200 flex items-center justify-between text-[11px] text-slate-400 print:text-slate-600">
                                              <span>{entry.academicYear}</span>
                                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                                <CheckCircle2 size={11} /> Published
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
