"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import {
  Bell,
  Search,
  Plus,
  Trash2,
  Clock,
  Copy,
  X,
  Check,
} from "lucide-react";

type TimeSlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  createdAt: string;
};

const DAY_MAPPING: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export default function TimeSlotsPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const [activeDay, setActiveDay] = useState<number>(1);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Copy Modal State
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetDays, setCopyTargetDays] = useState<number[]>([]);
  const [copying, setCopying] = useState(false);

  async function loadTimeSlots() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/timeslots", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load time slots");
      }

      setTimeSlots(data);
    } catch (error) {
      console.error("Load time slots error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load time slots"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTimeSlots();
  }, []);

  const activeSlots = useMemo(() => {
    return timeSlots
      .filter((slot) => slot.dayOfWeek === activeDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timeSlots, activeDay]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!startTime || !endTime) {
      setError("Please enter both start time and end time.");
      return;
    }

    if (startTime >= endTime) {
      setError("Start time must be before end time.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/timeslots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dayOfWeek: activeDay,
          startTime,
          endTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create time slot");
      }

      setSuccess("Time slot created successfully.");
      setStartTime("");
      setEndTime("");

      await loadTimeSlots();
    } catch (error) {
      console.error("Create time slot error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create time slot"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this time slot?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/timeslots", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete time slot");
      }

      setSuccess("Time slot deleted successfully.");
      await loadTimeSlots();
    } catch (error) {
      console.error("Delete time slot error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete time slot"
      );
    }
  }

  // --- BULK COPY LOGIC ---
  const handleOpenCopyModal = () => {
    if (activeSlots.length === 0) {
      setError(`Cannot copy ${DAY_MAPPING[activeDay]} because it has no time slots configured.`);
      return;
    }
    setError("");
    setSuccess("");
    // Default select all other days
    const otherDays = Object.keys(DAY_MAPPING)
      .map(Number)
      .filter((day) => day !== activeDay);
    setCopyTargetDays(otherDays);
    setShowCopyModal(true);
  };

  const handleToggleTargetDay = (day: number) => {
    setCopyTargetDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleBulkCopy = async () => {
    if (copyTargetDays.length === 0) {
      setError("Please select at least one target day to copy to.");
      setShowCopyModal(false);
      return;
    }

    setCopying(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/timeslots/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceDay: activeDay,
          targetDays: copyTargetDays,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to copy time slots.");
      }

      let successMessage = `Successfully processed slots. Inserted: ${data.insertedCount}.`;
      if (data.skippedCount > 0) {
        successMessage += ` Skipped ${data.skippedCount} slots (Duplicates: ${data.skippedDuplicates}, Overlaps: ${data.skippedOverlaps}).`;
      }
      setSuccess(successMessage);
      setShowCopyModal(false);
      await loadTimeSlots();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to copy time slots.");
    } finally {
      setCopying(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar />

      <section className="flex-1 h-screen overflow-y-auto relative">
        {/* TOPBAR */}
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 shrink-0 bg-slate-950 sticky top-0 z-10">
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl w-96">
            <Search size={18} className="text-gray-400" />
            <input
              placeholder="Search..."
              className="bg-transparent outline-none w-full text-white placeholder:text-gray-500"
            />
          </div>

          <div className="flex items-center gap-6">
            <Bell />
            <div className="bg-cyan-500 h-10 w-10 rounded-full flex items-center justify-center font-semibold">
              A
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div className="p-8">
          {/* PAGE HEADER */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold">Time Slots</h1>
              <p className="text-gray-400 mt-2">
                Manage available time slots for timetables (Day by Day)
              </p>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-xl">
              <span className="text-cyan-400 font-semibold">
                {timeSlots.length}
              </span>
              <span className="text-gray-400 ml-2">Total Slots (All Days)</span>
            </div>
          </div>

          {/* DAY TABS */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
            {Object.entries(DAY_MAPPING).map(([key, label]) => {
              const dayNum = Number(key);
              const isActive = activeDay === dayNum;
              const count = timeSlots.filter((s) => s.dayOfWeek === dayNum).length;
              return (
                <button
                  key={dayNum}
                  onClick={() => {
                    setActiveDay(dayNum);
                    setError("");
                    setSuccess("");
                  }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                    isActive
                      ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                      : "bg-slate-900 text-gray-400 hover:bg-slate-800 hover:text-gray-300"
                  }`}
                >
                  {label}
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs ${
                      isActive ? "bg-white/20" : "bg-slate-800"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ERROR & SUCCESS */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-green-400">
              {success}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: ACTIVE DAY VIEW */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* COPY ACTION */}
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    {DAY_MAPPING[activeDay]} Configuration
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    You have {activeSlots.length} slot(s) configured for {DAY_MAPPING[activeDay]}.
                  </p>
                </div>
                <button
                  onClick={handleOpenCopyModal}
                  className="bg-slate-800 hover:bg-slate-700 border border-white/10 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  <Copy size={16} className="text-cyan-400" />
                  Copy {DAY_MAPPING[activeDay]} to...
                </button>
              </div>

              {/* LIST OF SLOTS FOR ACTIVE DAY */}
              <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
                {loading ? (
                  <div className="p-10 text-center text-gray-400">Loading...</div>
                ) : activeSlots.length === 0 ? (
                  <div className="p-12 text-center border-t border-white/5">
                    <Clock size={40} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400">No time slots for {DAY_MAPPING[activeDay]}.</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Add a time slot using the form on the right.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 text-sm">
                        <th className="px-6 py-4">Start Time</th>
                        <th className="px-6 py-4">End Time</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSlots.map((slot) => (
                        <tr key={slot.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-6 py-4">
                            <span className="bg-slate-950 border border-white/5 px-3 py-1.5 rounded-lg text-cyan-400 font-mono font-medium">
                              {slot.startTime}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-950 border border-white/5 px-3 py-1.5 rounded-lg text-cyan-400 font-mono font-medium">
                              {slot.endTime}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDelete(slot.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                              title="Delete time slot"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: ADD SLOT FORM */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 self-start sticky top-28">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-cyan-500/10 p-3 rounded-xl">
                  <Plus className="text-cyan-400" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Add Slot</h2>
                  <p className="text-gray-400 text-sm">For {DAY_MAPPING[activeDay]}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 [color-scheme:dark]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 [color-scheme:dark]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-50 rounded-xl px-5 py-3 font-semibold flex items-center justify-center gap-2 mt-4"
                >
                  <Plus size={20} />
                  {saving ? "Adding..." : "Add to " + DAY_MAPPING[activeDay]}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* COPY MODAL */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Copy size={18} className="text-cyan-400" />
                Copy {DAY_MAPPING[activeDay]}'s Slots
              </h3>
              <button
                onClick={() => setShowCopyModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-400 mb-4">
                Select the days you want to duplicate {DAY_MAPPING[activeDay]}'s configuration to. 
                This will create {activeSlots.length} slot(s) for each selected day. Existing identical slots will be skipped.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(DAY_MAPPING).map(([key, label]) => {
                  const dayNum = Number(key);
                  if (dayNum === activeDay) return null;
                  
                  const isSelected = copyTargetDays.includes(dayNum);
                  
                  return (
                    <label
                      key={dayNum}
                      className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? "bg-cyan-500 border-cyan-500" : "border-gray-500"
                      }`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isSelected}
                        onChange={() => handleToggleTargetDay(dayNum)}
                      />
                      <span className="font-medium">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-slate-950 flex items-center justify-between">
              <button
                onClick={() => setCopyTargetDays(Object.keys(DAY_MAPPING).map(Number).filter(d => d !== activeDay))}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                Select All
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCopyModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkCopy}
                  disabled={copying || copyTargetDays.length === 0}
                  className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 px-5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  {copying ? "Copying..." : "Confirm Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
