"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import {
  Bell,
  Search,
  Plus,
  Trash2,
  GraduationCap,
  X,
} from "lucide-react";

type Faculty = {
  id: string;
  employeeId: string;
  designation: string | null;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  department: string;
  departmentCode: string;
  departmentId: string;
  subjectCount: number;
  createdAt: string;
};

type Department = {
  id: string;
  name: string;
  code: string;
};

export default function FacultyPage() {
  // =========================================================
  // DATA
  // =========================================================

  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // =========================================================
  // FORM
  // =========================================================

  const [showForm, setShowForm] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  // =========================================================
  // UI STATE
  // =========================================================

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================================
  // LOAD FACULTY
  // =========================================================

  async function loadFaculty() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/faculty", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();
      console.log("SUBJECT - faculty response:", data);
console.log("SUBJECT - faculty count:", data.length);

data.forEach((member: any) => {
  console.log(
    "FACULTY:",
    member.firstName,
    member.lastName,
    "facultyId:",
    member.id,
    "departmentId:",
    member.departmentId
  );
});

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load faculty"
        );
      }

      setFaculty(data);
    } catch (error) {
      console.error("Load faculty error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load faculty"
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
      const response = await fetch(
        "/api/departments",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();
      console.log("SUBJECT - departments response:", data);
console.log("SUBJECT - selected department:", data[0]?.id);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load departments"
        );
      }

    console.log("FACULTY - departments response:", data);
console.log("FACULTY - departments count:", data.length);

if (!Array.isArray(data)) {
  throw new Error("Departments API did not return an array");
}

setDepartments(data);

if (data.length > 0) {
  setDepartmentId(data[0].id);
}
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
    }
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadFaculty();
    loadDepartments();
  }, []);

  // =========================================================
  // OPEN ADD FACULTY FORM
  // =========================================================

  function openAddFacultyForm() {
    setError("");
    setSuccess("");

    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setEmployeeId("");
    setDesignation("");
    setPhone("");

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
  // ADD FACULTY
  // =========================================================

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!firstName.trim()) {
      setError(
        "Please enter faculty first name."
      );
      return;
    }

    if (!lastName.trim()) {
      setError(
        "Please enter faculty last name."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Please enter faculty email."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter a password."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (!employeeId.trim()) {
      setError(
        "Please enter employee ID."
      );
      return;
    }

    if (!departmentId) {
      setError(
        "Please select a department."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/faculty",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            firstName:
              firstName.trim(),

            lastName:
              lastName.trim(),

            email:
              email.trim().toLowerCase(),

            password,

            employeeId:
              employeeId
                .trim()
                .toUpperCase(),

            designation:
              designation.trim() ||
              null,

            phone:
              phone.trim() || null,

            departmentId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create faculty"
        );
      }

      setSuccess(
        "Faculty added successfully."
      );

      setShowForm(false);

      await loadFaculty();

      // Reset form

      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setEmployeeId("");
      setDesignation("");
      setPhone("");
    } catch (error) {
      console.error(
        "Create faculty error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create faculty"
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // DELETE FACULTY
  // =========================================================

  async function handleDelete(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this faculty member?"
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/faculty",
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete faculty"
        );
      }

      setSuccess(
        "Faculty deleted successfully."
      );

      await loadFaculty();
    } catch (error) {
      console.error(
        "Delete faculty error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete faculty"
      );
    }
  }

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredFaculty =
    faculty.filter((member) => {
      const searchText =
        search.toLowerCase().trim();

      return (
        member.name
          .toLowerCase()
          .includes(searchText) ||
        member.email
          .toLowerCase()
          .includes(searchText) ||
        member.employeeId
          .toLowerCase()
          .includes(searchText) ||
        member.department
          .toLowerCase()
          .includes(searchText) ||
        (member.designation
          ?.toLowerCase()
          .includes(searchText) ??
          false)
      );
    });

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar />

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <section className="flex-1">
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

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="p-8">
          {/* HEADER */}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <GraduationCap
                  className="text-cyan-400"
                  size={34}
                />

                <h1 className="text-4xl font-bold">
                  Faculty Management
                </h1>
              </div>

              <p className="text-gray-400 mt-2">
                Manage faculty members,
                departments and academic
                assignments.
              </p>
            </div>

            <button
              onClick={
                openAddFacultyForm
              }
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition font-semibold"
            >
              <Plus size={20} />

              Add Faculty
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
              placeholder="Search faculty..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              className="bg-transparent outline-none w-full text-white placeholder-gray-500"
            />
          </div>

          {/* =================================================
              FACULTY TABLE
          ================================================= */}

          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900">
            {loading ? (
              <div className="p-10 text-center text-gray-400">
                Loading faculty...
              </div>
            ) : filteredFaculty.length ===
              0 ? (
              <div className="p-10 text-center">
                <GraduationCap
                  size={46}
                  className="mx-auto text-gray-600 mb-4"
                />

                <p className="text-gray-400">
                  {search
                    ? "No faculty members match your search."
                    : "No faculty members found."}
                </p>

                {!search && (
                  <p className="text-gray-500 text-sm mt-1">
                    Click "Add Faculty"
                    to create your first
                    faculty member.
                  </p>
                )}
              </div>
            ) : (
              <table className="w-full min-w-[1100px]">
                <thead className="border-b border-white/10">
                  <tr className="text-left text-gray-400">
                    <th className="px-6 py-4">
                      Faculty
                    </th>

                    <th className="px-6 py-4">
                      Employee ID
                    </th>

                    <th className="px-6 py-4">
                      Email
                    </th>

                    <th className="px-6 py-4">
                      Designation
                    </th>

                    <th className="px-6 py-4">
                      Department
                    </th>

                    <th className="px-6 py-4">
                      Subjects
                    </th>

                    <th className="px-6 py-4">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredFaculty.map(
                    (member) => (
                      <tr
                        key={member.id}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        {/* FACULTY */}

                        <td className="px-6 py-5">
                          <div className="font-medium">
                            {member.name}
                          </div>

                          {member.phone && (
                            <div className="text-xs text-gray-500 mt-1">
                              {
                                member.phone
                              }
                            </div>
                          )}
                        </td>

                        {/* EMPLOYEE ID */}

                        <td className="px-6 py-5 text-cyan-400">
                          {
                            member.employeeId
                          }
                        </td>

                        {/* EMAIL */}

                        <td className="px-6 py-5 text-gray-400">
                          {member.email}
                        </td>

                        {/* DESIGNATION */}

                        <td className="px-6 py-5 text-gray-300">
                          {member.designation ||
                            "—"}
                        </td>

                        {/* DEPARTMENT */}

                        <td className="px-6 py-5">
                          <div className="text-gray-300">
                            {
                              member.department
                            }
                          </div>

                          <div className="text-xs text-gray-500 mt-1">
                            {
                              member.departmentCode
                            }
                          </div>
                        </td>

                        {/* SUBJECT COUNT */}

                        <td className="px-6 py-5 text-gray-300">
                          {
                            member.subjectCount
                          }
                        </td>

                        {/* STATUS */}

                        <td className="px-6 py-5">
                          {member.isActive ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* DELETE */}

                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() =>
                              handleDelete(
                                member.id
                              )
                            }
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition"
                            title="Delete faculty"
                          >
                            <Trash2
                              size={19}
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
                filteredFaculty.length
              }
            </span>{" "}
            of{" "}
            <span className="text-gray-300">
              {faculty.length}
            </span>{" "}
            faculty members
          </div>
        </div>
      </section>

      {/* =====================================================
          ADD FACULTY MODAL
      ===================================================== */}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8 shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-2xl font-bold">
                  Add Faculty
                </h2>

                <p className="text-gray-400 text-sm mt-1">
                  Enter faculty account
                  information.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="p-2 rounded-lg hover:bg-white/10 transition"
              >
                <X size={22} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="grid md:grid-cols-2 gap-5"
            >
              {/* FIRST NAME */}

              <div>
                <label className="text-sm text-gray-300">
                  First Name
                </label>

                <input
                  type="text"
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(
                      event.target.value
                    )
                  }
                  placeholder="Enter Name"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              {/* LAST NAME */}

              <div>
                <label className="text-sm text-gray-300">
                  Last Name
                </label>

                <input
                  type="text"
                  value={lastName}
                  onChange={(event) =>
                    setLastName(
                      event.target.value
                    )
                  }
                  placeholder="Faculty"
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
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="faculty@college.edu"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              {/* PASSWORD */}

              <div>
                <label className="text-sm text-gray-300">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Minimum 8 characters"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              {/* EMPLOYEE ID */}

              <div>
                <label className="text-sm text-gray-300">
                  Employee ID
                </label>

                <input
                  type="text"
                  value={employeeId}
                  onChange={(event) =>
                    setEmployeeId(
                      event.target.value
                    )
                  }
                  placeholder="FAC-001"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400 uppercase"
                />
              </div>

              {/* DESIGNATION */}

              <div>
                <label className="text-sm text-gray-300">
                  Designation
                </label>

                <select
                  value={designation}
                  onChange={(event) =>
                    setDesignation(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                >
                  <option value="">
                    Select designation
                  </option>

                  <option value="Professor">
                    Professor
                  </option>

                  <option value="Associate Professor">
                    Associate Professor
                  </option>

                  <option value="Assistant Professor">
                    Assistant Professor
                  </option>

                  <option value="Lecturer">
                    Lecturer
                  </option>

                  <option value="Lab Assistant">
                    Lab Assistant
                  </option>
                </select>
              </div>

              {/* PHONE */}

              <div>
                <label className="text-sm text-gray-300">
                  Phone
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value
                    )
                  }
                  placeholder="9876543210"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              {/* DEPARTMENT */}

              <div>
                <label className="text-sm text-gray-300">
                  Department
                </label>

                <select
                  value={departmentId}
                  onChange={(event) =>
                    setDepartmentId(
                      event.target.value
                    )
                  }
                  disabled={
                    departments.length ===
                    0
                  }
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400 disabled:opacity-50"
                >
                  {departments.length ===
                  0 ? (
                    <option value="">
                      No departments
                      available
                    </option>
                  ) : (
                    <>
                      <option value="">
                        Select department
                      </option>

                      {departments.map(
                        (department) => (
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

              {/* ACTIONS */}

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    departments.length ===
                      0
                  }
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving
                    ? "Saving..."
                    : "Save Faculty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}