"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import {
  Bell,
  Search,
  Plus,
  Trash2,
  Clock,
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
  7: "Sunday",
};

export default function TimeSlotsPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
        throw new Error(
          data.error || "Failed to load time slots"
        );
      }

      setTimeSlots(data);
    } catch (error) {
      console.error("Load time slots error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load time slots"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTimeSlots();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
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
          dayOfWeek,
          startTime,
          endTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create time slot"
        );
      }

      setSuccess("Time slot created successfully.");

      setStartTime("");
      setEndTime("");
      // Keep dayOfWeek to make it easier to add multiple for same day

      await loadTimeSlots();
    } catch (error) {
      console.error("Create time slot error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create time slot"
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
        body: JSON.stringify({
          id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete time slot"
        );
      }

      setSuccess("Time slot deleted successfully.");

      await loadTimeSlots();
    } catch (error) {
      console.error("Delete time slot error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete time slot"
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar />

      <section className="flex-1">
        {/* TOPBAR */}
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8">
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Time Slots</h1>
              <p className="text-gray-400 mt-2">
                Manage available time slots for timetables
              </p>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-xl">
              <span className="text-cyan-400 font-semibold">
                {timeSlots.length}
              </span>
              <span className="text-gray-400 ml-2">Time Slots</span>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-400">
              {error}
            </div>
          )}

          {/* SUCCESS */}
          {success && (
            <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-green-400">
              {success}
            </div>
          )}

          {/* ADD TIME SLOT */}
          <div className="mt-8 bg-slate-900 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-cyan-500/10 p-3 rounded-xl">
                <Plus className="text-cyan-400" size={22} />
              </div>

              <div>
                <h2 className="text-xl font-semibold">Add Time Slot</h2>
                <p className="text-gray-400 text-sm">
                  Create a new time slot
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid md:grid-cols-4 gap-5"
            >
              {/* DAY OF WEEK */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Day of Week
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(event) =>
                    setDayOfWeek(Number(event.target.value))
                  }
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 appearance-none"
                >
                  {Object.entries(DAY_MAPPING).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* START TIME */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 [color-scheme:dark]"
                  required
                />
              </div>

              {/* END TIME */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 [color-scheme:dark]"
                  required
                />
              </div>

              {/* BUTTON */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-50 rounded-xl px-5 py-3 font-semibold flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  {saving ? "Creating..." : "Create Time Slot"}
                </button>
              </div>
            </form>
          </div>

          {/* TIME SLOT LIST */}
          <div className="mt-8 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold">Time Slot List</h2>
              <p className="text-gray-400 text-sm mt-1">
                All time slots registered in the system
              </p>
            </div>

            {/* LOADING */}
            {loading ? (
              <div className="p-10 text-center text-gray-400">
                Loading time slots...
              </div>
            ) : timeSlots.length === 0 ? (
              /* EMPTY STATE */
              <div className="p-10 text-center">
                <Clock size={40} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">No time slots found.</p>
                <p className="text-gray-500 text-sm mt-1">
                  Create your first time slot above.
                </p>
              </div>
            ) : (
              /* TABLE */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-gray-400 text-sm">
                      <th className="px-6 py-4">Day</th>
                      <th className="px-6 py-4">Start Time</th>
                      <th className="px-6 py-4">End Time</th>
                      <th className="px-6 py-4">Created</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((slot) => (
                      <tr
                        key={slot.id}
                        className="border-b border-white/5 hover:bg-white/5"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="bg-cyan-500/10 p-2 rounded-lg">
                              <Clock size={20} className="text-cyan-400" />
                            </div>
                            <span className="font-medium">
                              {DAY_MAPPING[slot.dayOfWeek]}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="bg-slate-800 px-3 py-1 rounded-lg text-cyan-400 font-mono">
                            {slot.startTime}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="bg-slate-800 px-3 py-1 rounded-lg text-cyan-400 font-mono">
                            {slot.endTime}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-gray-400">
                          {new Date(slot.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => handleDelete(slot.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg"
                            title="Delete time slot"
                          >
                            <Trash2 size={19} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
