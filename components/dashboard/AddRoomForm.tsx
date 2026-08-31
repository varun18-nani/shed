"use client";

import { useState } from "react";
import { X } from "lucide-react";

type RoomData = {
  room: string;
  building: string;
  type: string;
  capacity: string;
  status: string;
};

type Props = {
  onClose: () => void;
  onSave: (room: RoomData) => void;
};

export default function AddRoomForm({
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<RoomData>({
    room: "",
    building: "Main Block",
    type: "Classroom",
    capacity: "60",
    status: "Available",
  });

  const update = (field: keyof RoomData, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (!form.room.trim()) {
      alert("Please enter a room number.");
      return;
    }

    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">

      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8">

        <div className="flex items-center justify-between mb-6">

          <div>
            <h2 className="text-2xl font-bold">
              Add Room
            </h2>

            <p className="text-gray-400 text-sm mt-1">
              Enter classroom or laboratory information.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <X size={22} />
          </button>

        </div>

        <div className="grid md:grid-cols-2 gap-5">

          <div>
            <label className="text-sm text-gray-300">
              Room Number
            </label>

            <input
              value={form.room}
              onChange={(e) => update("room", e.target.value)}
              placeholder="CSE-101"
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Building
            </label>

            <select
              value={form.building}
              onChange={(e) =>
                update("building", e.target.value)
              }
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            >
              <option>Main Block</option>
              <option>Computer Science Block</option>
              <option>Engineering Block</option>
              <option>Science Block</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Room Type
            </label>

            <select
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            >
              <option>Classroom</option>
              <option>Computer Lab</option>
              <option>Laboratory</option>
              <option>Seminar Hall</option>
              <option>Auditorium</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Capacity
            </label>

            <input
              type="number"
              value={form.capacity}
              onChange={(e) =>
                update("capacity", e.target.value)
              }
              placeholder="60"
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

        </div>

        <div className="flex justify-end gap-3 mt-8">

          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold hover:scale-105 transition"
          >
            Save Room
          </button>

        </div>

      </div>
    </div>
  );
}