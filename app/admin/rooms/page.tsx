"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import {
  Bell,
  Search,
  Plus,
  Trash2,
  Building2,
  X,
} from "lucide-react";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const ROOM_TYPES = [
  { value: "CLASSROOM", label: "Classroom" },
  { value: "COMPUTER_LAB", label: "Computer Lab" },
  { value: "LABORATORY", label: "Laboratory" },
  { value: "SEMINAR_HALL", label: "Seminar Hall" },
  { value: "AUDITORIUM", label: "Auditorium" },
] as const;

type RoomTypeValue = (typeof ROOM_TYPES)[number]["value"];

function getRoomTypeLabel(value: string): string {
  return ROOM_TYPES.find((t) => t.value === value)?.label ?? value;
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Department = {
  id: string;
  name: string;
  code: string;
};

type Room = {
  id: string;
  roomNumber: string;
  building: string;
  type: string;
  capacity: number;
  status: "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE";
  departmentId: string | null;
  createdAt: string;
  department: {
    id: string;
    name: string;
    code: string;
  } | null;
};

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: Room["status"] }) {
  const config: Record<
    Room["status"],
    { label: string; className: string }
  > = {
    AVAILABLE: {
      label: "Available",
      className:
        "bg-green-500/10 text-green-400 border border-green-500/20",
    },
    MAINTENANCE: {
      label: "Maintenance",
      className:
        "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    },
    UNAVAILABLE: {
      label: "Unavailable",
      className:
        "bg-red-500/10 text-red-400 border border-red-500/20",
    },
  };

  const { label, className } = config[status] ?? {
    label: status,
    className: "bg-white/10 text-gray-400",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm ${className}`}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

export default function RoomsPage() {
  // ── Data ──────────────────────────────────
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // ── Form ──────────────────────────────────
  const [showForm, setShowForm] = useState(false);

  const [roomNumber, setRoomNumber] = useState("");
  const [building, setBuilding] = useState("");
  const [type, setType] = useState<RoomTypeValue>("CLASSROOM");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState<"AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE">("AVAILABLE");
  const [departmentId, setDepartmentId] = useState("");

  // ── UI State ──────────────────────────────
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─────────────────────────────────────────
  // LOAD ROOMS
  // ─────────────────────────────────────────

  async function loadRooms() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/rooms", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load rooms");
      }

      setRooms(data);
    } catch (err) {
      console.error("Load rooms error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load rooms"
      );
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────
  // LOAD DEPARTMENTS
  // ─────────────────────────────────────────

  async function loadDepartments() {
    try {
      const response = await fetch("/api/departments", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load departments");
      }

      setDepartments(data);
    } catch (err) {
      console.error("Load departments error:", err);
    }
  }

  // ─────────────────────────────────────────
  // INITIAL LOAD
  // ─────────────────────────────────────────

  useEffect(() => {
    loadRooms();
    loadDepartments();
  }, []);

  // ─────────────────────────────────────────
  // OPEN MODAL
  // ─────────────────────────────────────────

  function openForm() {
    setError("");
    setSuccess("");
    setRoomNumber("");
    setBuilding("");
    setType("CLASSROOM");
    setCapacity("");
    setStatus("AVAILABLE");
    setDepartmentId("");
    setShowForm(true);
  }

  // ─────────────────────────────────────────
  // CREATE ROOM
  // ─────────────────────────────────────────

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedRoomNumber = roomNumber.trim();
    const trimmedBuilding = building.trim();
    const numericCapacity = Number(capacity);

    if (!trimmedRoomNumber) {
      setError("Please enter a room number.");
      return;
    }

    if (!trimmedBuilding) {
      setError("Please enter a building name.");
      return;
    }

    if (
      !capacity ||
      !Number.isInteger(numericCapacity) ||
      numericCapacity <= 0
    ) {
      setError("Capacity must be a positive whole number.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: trimmedRoomNumber,
          building: trimmedBuilding,
          type,
          capacity: numericCapacity,
          status,
          departmentId: departmentId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create room");
      }

      setSuccess("Room created successfully.");
      setShowForm(false);
      await loadRooms();
    } catch (err) {
      console.error("Create room error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create room"
      );
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────
  // DELETE ROOM
  // ─────────────────────────────────────────

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this room?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/rooms", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete room");
      }

      setSuccess("Room deleted successfully.");
      await loadRooms();
    } catch (err) {
      console.error("Delete room error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete room"
      );
    }
  }

  // ─────────────────────────────────────────
  // SEARCH FILTER
  // ─────────────────────────────────────────

  const filteredRooms = rooms.filter((room) => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return true;

    const typeLabel = getRoomTypeLabel(room.type).toLowerCase();

    return (
      room.roomNumber.toLowerCase().includes(searchText) ||
      room.building.toLowerCase().includes(searchText) ||
      typeLabel.includes(searchText) ||
      room.status.toLowerCase().includes(searchText) ||
      room.department?.name.toLowerCase().includes(searchText) ||
      room.department?.code.toLowerCase().includes(searchText) ||
      false
    );
  });

  // ─────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────

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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <Building2 className="text-cyan-400" size={32} />

                <h1 className="text-4xl font-bold">Room Management</h1>
              </div>

              <p className="text-gray-400 mt-2">
                Manage classrooms, laboratories and available spaces.
              </p>
            </div>

            <button
              onClick={openForm}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition font-semibold"
            >
              <Plus size={20} />
              Add Room
            </button>
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

          {/* SEARCH */}
          <div className="mt-8 flex items-center gap-3 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 max-w-md">
            <Search className="text-gray-400" size={20} />

            <input
              type="text"
              placeholder="Search rooms..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="bg-transparent outline-none w-full text-white placeholder-gray-500"
            />
          </div>

          {/* TABLE */}
          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900">
            {loading ? (
              <div className="p-10 text-center text-gray-400">
                Loading rooms...
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="p-10 text-center">
                <Building2
                  size={42}
                  className="mx-auto text-gray-600 mb-4"
                />

                <p className="text-gray-400">
                  {search
                    ? "No rooms match your search."
                    : "No rooms found."}
                </p>

                {!search && (
                  <p className="text-gray-500 text-sm mt-1">
                    Click &quot;Add Room&quot; to add your first room.
                  </p>
                )}
              </div>
            ) : (
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-white/10">
                  <tr className="text-left text-gray-400 text-sm">
                    <th className="px-6 py-4">Room Number</th>
                    <th className="px-6 py-4">Building</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Capacity</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRooms.map((room) => (
                    <tr
                      key={room.id}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      {/* ROOM NUMBER */}
                      <td className="px-6 py-5">
                        <span className="font-semibold text-cyan-400">
                          {room.roomNumber}
                        </span>
                      </td>

                      {/* BUILDING */}
                      <td className="px-6 py-5 text-gray-300">
                        {room.building}
                      </td>

                      {/* TYPE */}
                      <td className="px-6 py-5 text-gray-300">
                        {getRoomTypeLabel(room.type)}
                      </td>

                      {/* CAPACITY */}
                      <td className="px-6 py-5 text-gray-300">
                        {room.capacity}
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-5">
                        <StatusBadge status={room.status} />
                      </td>

                      {/* DEPARTMENT */}
                      <td className="px-6 py-5 text-gray-400">
                        {room.department ? (
                          <div>
                            <div className="text-gray-300">
                              {room.department.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {room.department.code}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-600 italic text-sm">
                            Shared
                          </span>
                        )}
                      </td>

                      {/* ACTION */}
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleDelete(room.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition"
                          title="Delete room"
                        >
                          <Trash2 size={19} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* COUNT */}
          {!loading && (
            <div className="mt-5 text-sm text-gray-500">
              Showing{" "}
              <span className="text-gray-300">{filteredRooms.length}</span>{" "}
              of{" "}
              <span className="text-gray-300">{rooms.length}</span> rooms
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────
          ADD ROOM MODAL
      ───────────────────────────────────────── */}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8 shadow-2xl">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-2xl font-bold">Add Room</h2>

                <p className="text-gray-400 text-sm mt-1">
                  Register a classroom, lab or other space.
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition"
              >
                <X size={22} />
              </button>
            </div>

            {/* MODAL ERROR */}
            {error && showForm && (
              <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="grid md:grid-cols-2 gap-5"
            >
              {/* ROOM NUMBER */}
              <div>
                <label className="text-sm text-gray-300">
                  Room Number
                </label>

                <input
                  type="text"
                  value={roomNumber}
                  onChange={(event) => setRoomNumber(event.target.value)}
                  placeholder="CSE-101"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              {/* BUILDING */}
              <div>
                <label className="text-sm text-gray-300">Building</label>

                <input
                  type="text"
                  value={building}
                  onChange={(event) => setBuilding(event.target.value)}
                  placeholder="Computer Science Block"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              {/* ROOM TYPE */}
              <div>
                <label className="text-sm text-gray-300">Room Type</label>

                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as RoomTypeValue)
                  }
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                >
                  {ROOM_TYPES.map((roomType) => (
                    <option key={roomType.value} value={roomType.value}>
                      {roomType.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* CAPACITY */}
              <div>
                <label className="text-sm text-gray-300">Capacity</label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                  placeholder="60"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              {/* STATUS */}
              <div>
                <label className="text-sm text-gray-300">Status</label>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE")
                  }
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </select>
              </div>

              {/* DEPARTMENT (optional) */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-300">
                  Department{" "}
                  <span className="text-gray-500 text-xs">
                    (optional — leave blank for shared rooms)
                  </span>
                </label>

                <select
                  value={departmentId}
                  onChange={(event) => setDepartmentId(event.target.value)}
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                >
                  <option value="">— No department (shared) —</option>

                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} ({department.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* ACTIONS */}
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving ? "Creating..." : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}