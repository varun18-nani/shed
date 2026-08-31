"use client";

import { useState } from "react";
import { X } from "lucide-react";

type SubjectData = {
  code: string;
  name: string;
  department: string;
  semester: string;
  credits: string;
};

type Props = {
  onClose: () => void;
  onSave: (subject: SubjectData) => void;
};

export default function AddSubjectForm({
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<SubjectData>({
    code: "",
    name: "",
    department: "Computer Science",
    semester: "1st Semester",
    credits: "3",
  });

  const update = (field: keyof SubjectData, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (!form.code.trim() || !form.name.trim()) {
      alert("Please enter subject code and name.");
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
              Add Subject
            </h2>

            <p className="text-gray-400 text-sm mt-1">
              Enter subject information.
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
              Subject Code
            </label>

            <input
              value={form.code}
              onChange={(e) => update("code", e.target.value)}
              placeholder="CS401"
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Subject Name
            </label>

            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Operating Systems"
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
              Semester
            </label>

            <select
              value={form.semester}
              onChange={(e) =>
                update("semester", e.target.value)
              }
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            >
              <option>1st Semester</option>
              <option>2nd Semester</option>
              <option>3rd Semester</option>
              <option>4th Semester</option>
              <option>5th Semester</option>
              <option>6th Semester</option>
              <option>7th Semester</option>
              <option>8th Semester</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-300">
              Credits
            </label>

            <select
              value={form.credits}
              onChange={(e) =>
                update("credits", e.target.value)
              }
              className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
            >
              <option>1</option>
              <option>2</option>
              <option>3</option>
              <option>4</option>
              <option>5</option>
              <option>6</option>
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
            Save Subject
          </button>

        </div>

      </div>
    </div>
  );
}