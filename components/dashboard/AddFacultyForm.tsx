"use client";

import { useState } from "react";
import { X } from "lucide-react";

type FacultyData = {
  name: string;
  email: string;
  designation: string;
  department: string;
};

type AddFacultyFormProps = {
  onClose: () => void;
  onSave: (faculty: FacultyData) => Promise<void>;
};

export default function AddFacultyForm({
  onClose,
  onSave,
}: AddFacultyFormProps) {
  const [form, setForm] = useState<FacultyData>({
    name: "",
    email: "",
    designation: "Professor",
    department: "Computer Science",
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (
    field: keyof FacultyData,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      alert("Please enter name and email.");
      return;
    }

    try {
      setSaving(true);

      await onSave(form);

      onClose();
    } catch (error) {
      console.error(error);
      alert("Failed to save faculty.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              Add Faculty
            </h2>

            <p className="text-gray-400 text-sm mt-1">
              Enter faculty information.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10"
            disabled={saving}
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
              onChange={(e) =>
                handleChange("name", e.target.value)
              }
              placeholder="Dr. John Smith"
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
              onChange={(e) =>
                handleChange("email", e.target.value)
              }
              placeholder="faculty@college.edu"
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Designation
            </label>

            <select
              value={form.designation}
              onChange={(e) =>
                handleChange("designation", e.target.value)
              }
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            >
              <option>Professor</option>
              <option>Associate Professor</option>
              <option>Assistant Professor</option>
              <option>Senior Professor</option>
              <option>Lecturer</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Department
            </label>

            <select
              value={form.department}
              onChange={(e) =>
                handleChange("department", e.target.value)
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

        </div>

        <div className="flex justify-end gap-3 mt-8">

          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold hover:scale-105 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Faculty"}
          </button>

        </div>

      </div>
    </div>
  );
}