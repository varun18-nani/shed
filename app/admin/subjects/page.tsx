"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import {
  Bell,
  Search,
  Plus,
  Trash2,
  BookOpen,
  X,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Department = {
  id: string;
  name: string;
  code: string;
};

type FacultyUser = {
  firstName: string;
  lastName: string;
  email: string;
};

type Faculty = {
  id: string;
  employeeId: string;
  designation: string | null;
  departmentId: string;
  user: FacultyUser;
};

type Subject = {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  departmentId: string;
  facultyId: string | null;
  createdAt: string;
  department: {
    id: string;
    name: string;
    code: string;
  };
  faculty: {
    id: string;
    employeeId: string;
    designation: string | null;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
};

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

export default function SubjectsPage() {
  // ── Data ──────────────────────────────────
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allFaculty, setAllFaculty] = useState<Faculty[]>([]);

  // ── Form ──────────────────────────────────
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [semester, setSemester] = useState("1");
  const [credits, setCredits] = useState("");
  const [facultyId, setFacultyId] = useState("");

  // ── UI State ──────────────────────────────
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─────────────────────────────────────────
  // DERIVED: faculty filtered by selected dept
  // ─────────────────────────────────────────

  const filteredFacultyForForm = departmentId
    ? allFaculty.filter((f) => f.departmentId === departmentId)
    : allFaculty;

  // ─────────────────────────────────────────
  // LOAD SUBJECTS
  // ─────────────────────────────────────────

  async function loadSubjects() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/subjects", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load subjects");
      }

      setSubjects(data);
    } catch (err) {
      console.error("Load subjects error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load subjects"
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

      if (data.length > 0) {
        setDepartmentId(data[0].id);
      }
    } catch (err) {
      console.error("Load departments error:", err);
    }
  }

  // ─────────────────────────────────────────
  // LOAD FACULTY
  // ─────────────────────────────────────────

  async function loadFaculty() {
    try {
      const response = await fetch("/api/faculty", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load faculty");
      }

      // The faculty API returns a formatted list; we need departmentId
      // The formatted response includes departmentId directly.
      setAllFaculty(
        data.map(
          (member: {
            id: string;
            employeeId: string;
            designation: string | null;
            departmentId: string;
            firstName: string;
            lastName: string;
            email: string;
          }) => ({
            id: member.id,
            employeeId: member.employeeId,
            designation: member.designation,
            departmentId: member.departmentId,
            user: {
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
            },
          })
        )
      );
    } catch (err) {
      console.error("Load faculty error:", err);
    }
  }

  // ─────────────────────────────────────────
  // INITIAL LOAD
  // ─────────────────────────────────────────

  useEffect(() => {
    loadSubjects();
    loadDepartments();
    loadFaculty();
  }, []);

  // ─────────────────────────────────────────
  // WHEN DEPARTMENT CHANGES IN FORM
  // ─────────────────────────────────────────

  function handleDepartmentChange(newDepartmentId: string) {
    setDepartmentId(newDepartmentId);
    setFacultyId(""); // clear faculty when dept changes
  }

  // ─────────────────────────────────────────
  // OPEN MODAL
  // ─────────────────────────────────────────

  function openForm() {
    setError("");
    setSuccess("");
    setCode("");
    setName("");
    setSemester("1");
    setCredits("");
    setFacultyId("");

    if (departments.length > 0) {
      setDepartmentId(departments[0].id);
    }

    setShowForm(true);
  }

  // ─────────────────────────────────────────
  // CREATE SUBJECT
  // ─────────────────────────────────────────

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    const numericSemester = Number(semester);
    const numericCredits = Number(credits);

    if (!trimmedCode) {
      setError("Please enter a subject code.");
      return;
    }

    if (!trimmedName) {
      setError("Please enter a subject name.");
      return;
    }

    if (!departmentId) {
      setError("Please select a department.");
      return;
    }

    if (
      !numericCredits ||
      !Number.isInteger(numericCredits) ||
      numericCredits <= 0
    ) {
      setError("Credits must be a positive whole number.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: trimmedCode,
          name: trimmedName,
          departmentId,
          semester: numericSemester,
          credits: numericCredits,
          facultyId: facultyId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create subject");
      }

      setSuccess("Subject created successfully.");
      setShowForm(false);
      await loadSubjects();
    } catch (err) {
      console.error("Create subject error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create subject"
      );
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────
  // DELETE SUBJECT
  // ─────────────────────────────────────────

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this subject?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/subjects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete subject");
      }

      setSuccess("Subject deleted successfully.");
      await loadSubjects();
    } catch (err) {
      console.error("Delete subject error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete subject"
      );
    }
  }

  // ─────────────────────────────────────────
  // SEARCH FILTER
  // ─────────────────────────────────────────

  const filteredSubjects = subjects.filter((subject) => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return true;

    const facultyName = subject.faculty
      ? `${subject.faculty.user.firstName} ${subject.faculty.user.lastName}`.toLowerCase()
      : "";

    return (
      subject.code.toLowerCase().includes(searchText) ||
      subject.name.toLowerCase().includes(searchText) ||
      subject.department.name.toLowerCase().includes(searchText) ||
      subject.department.code.toLowerCase().includes(searchText) ||
      facultyName.includes(searchText)
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
                <BookOpen className="text-cyan-400" size={32} />

                <h1 className="text-4xl font-bold">Subject Management</h1>
              </div>

              <p className="text-gray-400 mt-2">
                Manage subjects, credits and faculty assignments.
              </p>
            </div>

            <button
              onClick={openForm}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition font-semibold"
            >
              <Plus size={20} />
              Add Subject
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
              placeholder="Search subjects..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="bg-transparent outline-none w-full text-white placeholder-gray-500"
            />
          </div>

          {/* TABLE */}
          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900">
            {loading ? (
              <div className="p-10 text-center text-gray-400">
                Loading subjects...
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="p-10 text-center">
                <BookOpen
                  size={42}
                  className="mx-auto text-gray-600 mb-4"
                />

                <p className="text-gray-400">
                  {search
                    ? "No subjects match your search."
                    : "No subjects found."}
                </p>

                {!search && (
                  <p className="text-gray-500 text-sm mt-1">
                    Click &quot;Add Subject&quot; to create your first subject.
                  </p>
                )}
              </div>
            ) : (
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-white/10">
                  <tr className="text-left text-gray-400 text-sm">
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Subject Name</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Semester</th>
                    <th className="px-6 py-4">Credits</th>
                    <th className="px-6 py-4">Faculty</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSubjects.map((subject) => (
                    <tr
                      key={subject.id}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      {/* CODE */}
                      <td className="px-6 py-5">
                        <span className="bg-slate-800 px-3 py-1 rounded-lg text-cyan-400 font-mono text-sm">
                          {subject.code}
                        </span>
                      </td>

                      {/* NAME */}
                      <td className="px-6 py-5 font-medium">
                        {subject.name}
                      </td>

                      {/* DEPARTMENT */}
                      <td className="px-6 py-5">
                        <div className="text-gray-300">
                          {subject.department.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {subject.department.code}
                        </div>
                      </td>

                      {/* SEMESTER */}
                      <td className="px-6 py-5 text-gray-300">
                        Semester {subject.semester}
                      </td>

                      {/* CREDITS */}
                      <td className="px-6 py-5">
                        <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm">
                          {subject.credits}{" "}
                          {subject.credits === 1 ? "credit" : "credits"}
                        </span>
                      </td>

                      {/* FACULTY */}
                      <td className="px-6 py-5 text-gray-300">
                        {subject.faculty ? (
                          <div>
                            <div>
                              {subject.faculty.user.firstName}{" "}
                              {subject.faculty.user.lastName}
                            </div>
                            {subject.faculty.designation && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {subject.faculty.designation}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* ACTION */}
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleDelete(subject.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition"
                          title="Delete subject"
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
              <span className="text-gray-300">{filteredSubjects.length}</span>{" "}
              of{" "}
              <span className="text-gray-300">{subjects.length}</span>{" "}
              subjects
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────
          ADD SUBJECT MODAL
      ───────────────────────────────────────── */}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8 shadow-2xl">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-2xl font-bold">Add Subject</h2>

                <p className="text-gray-400 text-sm mt-1">
                  Create a new subject and assign a faculty member.
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
              {/* SUBJECT CODE */}
              <div>
                <label className="text-sm text-gray-300">
                  Subject Code
                </label>

                <input
                  type="text"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase())
                  }
                  placeholder="CS301"
                  maxLength={20}
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400 font-mono uppercase"
                />
              </div>

              {/* SUBJECT NAME */}
              <div>
                <label className="text-sm text-gray-300">
                  Subject Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Data Structures"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              {/* DEPARTMENT */}
              <div>
                <label className="text-sm text-gray-300">Department</label>

                <select
                  value={departmentId}
                  onChange={(event) =>
                    handleDepartmentChange(event.target.value)
                  }
                  disabled={departments.length === 0}
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400 disabled:opacity-50"
                >
                  {departments.length === 0 ? (
                    <option>No departments available</option>
                  ) : (
                    departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name} ({department.code})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* SEMESTER */}
              <div>
                <label className="text-sm text-gray-300">Semester</label>

                <select
                  value={semester}
                  onChange={(event) => setSemester(event.target.value)}
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={String(s)}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* CREDITS */}
              <div>
                <label className="text-sm text-gray-300">Credits</label>

                <input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={credits}
                  onChange={(event) => setCredits(event.target.value)}
                  placeholder="3"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              {/* FACULTY (optional) */}
              <div>
                <label className="text-sm text-gray-300">
                  Faculty{" "}
                  <span className="text-gray-500 text-xs">(optional)</span>
                </label>

                <select
                  value={facultyId}
                  onChange={(event) => setFacultyId(event.target.value)}
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                >
                  <option value="">— Unassigned —</option>

                  {filteredFacultyForForm.length === 0 ? (
                    <option disabled>
                      {departmentId
                        ? "No faculty in this department"
                        : "No faculty available"}
                    </option>
                  ) : (
                    filteredFacultyForForm.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.user.firstName} {member.user.lastName}
                        {member.designation
                          ? ` — ${member.designation}`
                          : ""}
                      </option>
                    ))
                  )}
                </select>

                {departmentId && filteredFacultyForForm.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Showing faculty from selected department.
                  </p>
                )}
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
                  disabled={saving || departments.length === 0}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving ? "Creating..." : "Create Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
