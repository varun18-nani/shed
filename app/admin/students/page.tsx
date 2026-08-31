"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import {
  Bell,
  Search,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";

type Student = {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  departmentId: string;
  semester: number;
  section: string;
  sectionId: string | null;
};

type Department = {
  id: string;
  name: string;
  code: string;
};

type Section = {
  id: string;
  name: string;
  semester: number;
  departmentId: string;
};

export default function StudentsPage() {
  // =========================================================
  // DATA
  // =========================================================

  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // =========================================================
  // FORM
  // =========================================================

  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  const [departmentId, setDepartmentId] = useState("");
  const [semester, setSemester] = useState("1");
  const [sectionId, setSectionId] = useState("");

  // =========================================================
  // UI STATE
  // =========================================================

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingDepartments, setLoadingDepartments] =
    useState(true);
  const [loadingSections, setLoadingSections] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================================
  // LOAD STUDENTS
  // =========================================================

  async function loadStudents() {
    try {
      setLoading(true);

      const response = await fetch("/api/students", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load students"
        );
      }

      setStudents(data);
    } catch (error) {
      console.error("Load students error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load students"
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // LOAD DEPARTMENTS
  // =========================================================

  async function loadDepartments() {
    try {
      setLoadingDepartments(true);

      const response = await fetch("/api/departments", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load departments"
        );
      }

      setDepartments(data);

      // Do NOT automatically select a department
      // while the form is closed.
    } catch (error) {
      console.error(
        "Load departments error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load departments"
      );
    } finally {
      setLoadingDepartments(false);
    }
  }

  // =========================================================
  // LOAD SECTIONS
  // =========================================================

  async function loadSections(
    selectedDepartmentId: string,
    selectedSemester: string
  ) {
    if (!selectedDepartmentId) {
      setSections([]);
      setSectionId("");
      return;
    }

    if (!selectedSemester) {
      setSections([]);
      setSectionId("");
      return;
    }

    try {
      setLoadingSections(true);

      // Clear the previous section immediately.
      setSectionId("");

      const url =
        `/api/sections?departmentId=${encodeURIComponent(
          selectedDepartmentId
        )}` +
        `&semester=${encodeURIComponent(
          selectedSemester
        )}`;

      console.log(
        "Loading sections from:",
        url
      );

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      console.log(
        "Sections API response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load sections"
        );
      }

      setSections(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Load sections error:",
        error
      );

      setSections([]);
      setSectionId("");
    } finally {
      setLoadingSections(false);
    }
  }

  // =========================================================
  // INITIAL PAGE LOAD
  // =========================================================

  useEffect(() => {
    loadStudents();
    loadDepartments();
  }, []);

  // =========================================================
  // LOAD SECTIONS WHEN DEPARTMENT OR SEMESTER CHANGES
  // =========================================================

  useEffect(() => {
    if (!showForm) {
      return;
    }

    if (!departmentId) {
      setSections([]);
      setSectionId("");
      return;
    }

    loadSections(
      departmentId,
      semester
    );
  }, [
    departmentId,
    semester,
    showForm,
  ]);

  // =========================================================
  // OPEN ADD STUDENT FORM
  // =========================================================

  function openAddStudentForm() {
    setError("");
    setSuccess("");

    setName("");
    setEmail("");
    setRollNumber("");

    setSemester("1");

    setSections([]);
    setSectionId("");

    // Select first department if available.
    if (departments.length > 0) {
      setDepartmentId(
        departments[0].id
      );
    } else {
      setDepartmentId("");
    }

    setShowForm(true);
  }

  // =========================================================
  // CLOSE FORM
  // =========================================================

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);

    setName("");
    setEmail("");
    setRollNumber("");
    setSectionId("");
    setSections([]);
  }

  // =========================================================
  // ADD STUDENT
  // =========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    // -----------------------------
    // VALIDATION
    // -----------------------------

    if (!name.trim()) {
      setError(
        "Please enter student name."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Please enter student email."
      );
      return;
    }

    if (!rollNumber.trim()) {
      setError(
        "Please enter roll number."
      );
      return;
    }

    if (!departmentId) {
      setError(
        "Please select a department."
      );
      return;
    }

    if (!semester) {
      setError(
        "Please select a semester."
      );
      return;
    }

    // If sections exist, section must be selected.
    if (
      sections.length > 0 &&
      !sectionId
    ) {
      setError(
        "Please select a section."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: name.trim(),
        email: email.trim(),
        rollNumber:
          rollNumber
            .trim()
            .toUpperCase(),
        departmentId,
        semester: Number(semester),
        sectionId:
          sectionId || null,
      };

      console.log(
        "Creating student:",
        payload
      );

      const response = await fetch(
        "/api/students",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload
          ),
        }
      );

      const data =
        await response.json();

      console.log(
        "Create student response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create student"
        );
      }

      setSuccess(
        "Student added successfully."
      );

      // Close modal.
      setShowForm(false);

      // Refresh table.
      await loadStudents();

      // Reset form.
      setName("");
      setEmail("");
      setRollNumber("");
      setSectionId("");
      setSections([]);
    } catch (error) {
      console.error(
        "Create student error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create student"
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // DELETE STUDENT
  // =========================================================

  async function handleDelete(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this student?"
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/students",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete student"
        );
      }

      setSuccess(
        "Student deleted successfully."
      );

      await loadStudents();
    } catch (error) {
      console.error(
        "Delete student error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete student"
      );
    }
  }

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredStudents =
    students.filter(
      (student) => {
        const searchText =
          search
            .toLowerCase()
            .trim();

        if (!searchText) {
          return true;
        }

        return (
          student.name
            .toLowerCase()
            .includes(searchText) ||
          student.email
            .toLowerCase()
            .includes(searchText) ||
          student.rollNumber
            .toLowerCase()
            .includes(searchText) ||
          student.department
            .toLowerCase()
            .includes(searchText) ||
          student.section
            .toLowerCase()
            .includes(searchText)
        );
      }
    );

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white flex">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN */}
      <section className="flex-1 min-w-0">
        {/* ===================================================
            TOPBAR
        =================================================== */}

        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8">
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl w-96">
            <Search
              size={18}
              className="text-gray-400"
            />

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

        {/* ===================================================
            CONTENT
        =================================================== */}

        <div className="p-8">
          {/* HEADER */}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <Users
                  className="text-cyan-400"
                  size={32}
                />

                <h1 className="text-4xl font-bold">
                  Student Management
                </h1>
              </div>

              <p className="text-gray-400 mt-2">
                Manage students,
                departments,
                semesters and
                sections.
              </p>
            </div>

            <button
              onClick={
                openAddStudentForm
              }
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition font-semibold"
            >
              <Plus size={20} />

              Add Student
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
            <Search
              className="text-gray-400"
              size={20}
            />

            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              className="bg-transparent outline-none w-full text-white placeholder-gray-500"
            />
          </div>

          {/* =================================================
              STUDENT TABLE
          ================================================= */}

          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900">
            {loading ? (
              <div className="p-10 text-center text-gray-400">
                Loading students...
              </div>
            ) : filteredStudents.length ===
              0 ? (
              <div className="p-10 text-center">
                <Users
                  size={42}
                  className="mx-auto text-gray-600 mb-4"
                />

                <p className="text-gray-400">
                  {search
                    ? "No students match your search."
                    : "No students found."}
                </p>

                {!search && (
                  <p className="text-gray-500 text-sm mt-1">
                    Click "Add Student"
                    to create your
                    first student.
                  </p>
                )}
              </div>
            ) : (
              <table className="w-full min-w-[1000px]">
                <thead className="border-b border-white/10">
                  <tr className="text-left text-gray-400">
                    <th className="px-6 py-4">
                      Student
                    </th>

                    <th className="px-6 py-4">
                      Roll Number
                    </th>

                    <th className="px-6 py-4">
                      Email
                    </th>

                    <th className="px-6 py-4">
                      Department
                    </th>

                    <th className="px-6 py-4">
                      Semester
                    </th>

                    <th className="px-6 py-4">
                      Section
                    </th>

                    <th className="px-6 py-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map(
                    (student) => (
                      <tr
                        key={
                          student.id
                        }
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="px-6 py-5 font-medium">
                          {
                            student.name
                          }
                        </td>

                        <td className="px-6 py-5 text-cyan-400">
                          {
                            student.rollNumber
                          }
                        </td>

                        <td className="px-6 py-5 text-gray-400">
                          {
                            student.email
                          }
                        </td>

                        <td className="px-6 py-5 text-gray-300">
                          {
                            student.department
                          }
                        </td>

                        <td className="px-6 py-5 text-gray-300">
                          {
                            student.semester
                          }
                        </td>

                        <td className="px-6 py-5 text-gray-400">
                          {
                            student.section
                          }
                        </td>

                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() =>
                              handleDelete(
                                student.id
                              )
                            }
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition"
                            title="Delete student"
                          >
                            <Trash2
                              size={
                                19
                              }
                            />
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* COUNT */}

          <div className="mt-5 text-sm text-gray-500">
            Showing{" "}
            <span className="text-gray-300">
              {
                filteredStudents.length
              }
            </span>{" "}
            of{" "}
            <span className="text-gray-300">
              {students.length}
            </span>{" "}
            students
          </div>
        </div>
      </section>

      {/* =====================================================
          ADD STUDENT MODAL
      ===================================================== */}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8 shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-2xl font-bold">
                  Add Student
                </h2>

                <p className="text-gray-400 text-sm mt-1">
                  Enter student
                  information.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                className="p-2 rounded-lg hover:bg-white/10 transition"
              >
                <X size={22} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleSubmit
              }
              className="grid md:grid-cols-2 gap-5"
            >
              {/* NAME */}

              <div>
                <label className="text-sm text-gray-300">
                  Full Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(
                    event
                  ) =>
                    setName(
                      event.target
                        .value
                    )
                  }
                  placeholder="John Smith"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              {/* EMAIL */}

              <div>
                <label className="text-sm text-gray-300">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target
                        .value
                    )
                  }
                  placeholder="student@college.edu"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              {/* ROLL NUMBER */}

              <div>
                <label className="text-sm text-gray-300">
                  Roll Number
                </label>

                <input
                  type="text"
                  value={
                    rollNumber
                  }
                  onChange={(
                    event
                  ) =>
                    setRollNumber(
                      event.target
                        .value
                    )
                  }
                  placeholder="23CSE001"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400 uppercase"
                />
              </div>

              {/* DEPARTMENT */}

              <div>
                <label className="text-sm text-gray-300">
                  Department
                </label>

                <select
                  value={
                    departmentId
                  }
                  onChange={(
                    event
                  ) => {
                    setDepartmentId(
                      event.target
                        .value
                    );

                    setSectionId(
                      ""
                    );

                    setSections(
                      []
                    );
                  }}
                  disabled={
                    loadingDepartments ||
                    departments.length ===
                      0
                  }
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400 disabled:opacity-50"
                >
                  {loadingDepartments ? (
                    <option value="">
                      Loading departments...
                    </option>
                  ) : departments.length ===
                    0 ? (
                    <option value="">
                      No departments available
                    </option>
                  ) : (
                    <>
                      <option value="">
                        Select department
                      </option>

                      {departments.map(
                        (
                          department
                        ) => (
                          <option
                            key={
                              department.id
                            }
                            value={
                              department.id
                            }
                          >
                            {
                              department.name
                            }{" "}
                            (
                            {
                              department.code
                            }
                            )
                          </option>
                        )
                      )}
                    </>
                  )}
                </select>
              </div>

              {/* SEMESTER */}

              <div>
                <label className="text-sm text-gray-300">
                  Semester
                </label>

                <select
                  value={
                    semester
                  }
                  onChange={(
                    event
                  ) => {
                    setSemester(
                      event.target
                        .value
                    );

                    setSectionId(
                      ""
                    );

                    setSections(
                      []
                    );
                  }}
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                >
                  <option value="1">
                    Semester 1
                  </option>

                  <option value="2">
                    Semester 2
                  </option>

                  <option value="3">
                    Semester 3
                  </option>

                  <option value="4">
                    Semester 4
                  </option>

                  <option value="5">
                    Semester 5
                  </option>

                  <option value="6">
                    Semester 6
                  </option>

                  <option value="7">
                    Semester 7
                  </option>

                  <option value="8">
                    Semester 8
                  </option>
                </select>
              </div>

              {/* SECTION */}

              <div>
                <label className="text-sm text-gray-300">
                  Section
                </label>

                <select
                  value={
                    sectionId
                  }
                  onChange={(
                    event
                  ) =>
                    setSectionId(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    loadingSections ||
                    sections.length ===
                      0
                  }
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400 disabled:opacity-50"
                >
                  <option value="">
                    {loadingSections
                      ? "Loading sections..."
                      : sections.length ===
                        0
                      ? "No sections available"
                      : "Select section"}
                  </option>

                  {sections.map(
                    (section) => (
                      <option
                        key={
                          section.id
                        }
                        value={
                          section.id
                        }
                      >
                        {
                          section.name
                        }
                      </option>
                    )
                  )}
                </select>

                {/* SECTION STATUS */}

                {loadingSections && (
                  <p className="text-xs text-cyan-400 mt-2">
                    Loading sections
                    for Semester{" "}
                    {semester}...
                  </p>
                )}

                {!loadingSections &&
                  sections.length ===
                    0 &&
                  departmentId && (
                    <p className="text-xs text-gray-500 mt-2">
                      No section has
                      been created
                      for this
                      department
                      and semester.
                    </p>
                  )}

                {!loadingSections &&
                  sections.length >
                    0 && (
                    <p className="text-xs text-green-400 mt-2">
                      {
                        sections.length
                      }{" "}
                      section
                      {sections.length !==
                      1
                        ? "s"
                        : ""}{" "}
                      available.
                    </p>
                  )}
              </div>

              {/* =================================================
                  FORM ACTIONS
              ================================================= */}

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
                  }
                  className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    loadingDepartments ||
                    departments.length ===
                      0
                  }
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving
                    ? "Saving..."
                    : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}