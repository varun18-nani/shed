"use client";

import { useState } from "react";
import { X } from "lucide-react";

type StudentData = {
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  year: string;
  status: string;
};

type Props = {
  onClose: () => void;
  onSave: (student: StudentData) => void;
};

export default function AddStudentForm({
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<StudentData>({
    name: "",
    email: "",
    rollNumber: "",
    department: "Computer Science",
    year: "1st Year",
    status: "Active",
  });

  const update = (field: keyof StudentData, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.rollNumber.trim()
    ) {
      alert("Please fill Name, Email and Roll Number.");
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
              Add Student
            </h2>

            <p className="text-gray-400 text-sm mt-1">
              Enter student information.
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
              Full Name
            </label>

            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Student name"
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Email
            </label>

            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="student@college.edu"
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Roll Number
            </label>

            <input
              value={form.rollNumber}
              onChange={(e) =>
                update("rollNumber", e.target.value)
              }
              placeholder="23CSE001"
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Department
            </label>

            <select
              value={form.department}
              onChange={(e) =>
                update("department", e.target.value)
              }
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            >
              <option>Computer Science</option>
              <option>Information Technology</option>
              <option>Electronics</option>
              <option>Mechanical</option>
              <option>Civil</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Year
            </label>

            <select
              value={form.year}
              onChange={(e) => update("year", e.target.value)}
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            >
              <option>1st Year</option>
              <option>2nd Year</option>
              <option>3rd Year</option>
              <option>4th Year</option>
            </select>
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
            Save Student
          </button>

        </div>

      </div>
    </div>
  );
}