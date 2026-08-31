"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Sidebar from "@/components/layout/Sidebar";

import {
  Bell,
  Search,
  Plus,
  Trash2,
  Layers,
  X,
} from "lucide-react";

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
  capacity: number | null;
  createdAt: string;
};

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>(
    []
  );

  const [departments, setDepartments] = useState<
    Department[]
  >([]);

  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");

  const [departmentId, setDepartmentId] =
    useState("");

  const [semester, setSemester] = useState("1");

  const [capacity, setCapacity] = useState("");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // --------------------------------------------------
  // LOAD SECTIONS
  // --------------------------------------------------

  async function loadSections() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/sections",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load sections"
        );
      }

      setSections(data);
    } catch (error) {
      console.error(
        "Load sections error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load sections"
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // LOAD DEPARTMENTS
  // --------------------------------------------------

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

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load departments"
        );
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

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    loadSections();
    loadDepartments();
  }, []);

  // --------------------------------------------------
  // CREATE SECTION
  // --------------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Please enter a section name.");
      return;
    }

    if (!departmentId) {
      setError("Please select a department.");
      return;
    }

    if (!semester) {
      setError("Please select a semester.");
      return;
    }

    let numericCapacity: number | null = null;

    if (capacity.trim()) {
      numericCapacity = Number(capacity);

      if (
        !Number.isInteger(numericCapacity) ||
        numericCapacity <= 0
      ) {
        setError(
          "Capacity must be a positive whole number."
        );

        return;
      }
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/sections",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: name.trim().toUpperCase(),

            departmentId,

            semester: Number(semester),

            capacity: numericCapacity,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create section"
        );
      }

      setSuccess(
        "Section created successfully."
      );

      setName("");

      setCapacity("");

      setSemester("1");

      if (departments.length > 0) {
        setDepartmentId(
          departments[0].id
        );
      }

      setShowForm(false);

      await loadSections();
    } catch (error) {
      console.error(
        "Create section error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create section"
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // DELETE SECTION
  // --------------------------------------------------

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this section?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/sections",
        {
          method: "DELETE",

          headers: {
            "Content-Type": "application/json",
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
            "Failed to delete section"
        );
      }

      setSuccess(
        "Section deleted successfully."
      );

      await loadSections();
    } catch (error) {
      console.error(
        "Delete section error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete section"
      );
    }
  }

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredSections =
    sections.filter((section) => {
      const department =
        departments.find(
          (item) =>
            item.id ===
            section.departmentId
        );

      const searchText = search
        .toLowerCase()
        .trim();

      return (
        section.name
          .toLowerCase()
          .includes(searchText) ||
        String(section.semester)
          .includes(searchText) ||
        department?.name
          .toLowerCase()
          .includes(searchText) ||
        department?.code
          .toLowerCase()
          .includes(searchText)
      );
    });

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar />

      <section className="flex-1">
        {/* TOPBAR */}

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

        {/* CONTENT */}

        <div className="p-8">
          {/* HEADER */}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <Layers
                  className="text-cyan-400"
                  size={32}
                />

                <h1 className="text-4xl font-bold">
                  Section Management
                </h1>
              </div>

              <p className="text-gray-400 mt-2">
                Manage sections for each
                department and semester.
              </p>
            </div>

            <button
              onClick={() => {
                setError("");
                setSuccess("");
                setShowForm(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition font-semibold"
            >
              <Plus size={20} />

              Add Section
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
              placeholder="Search sections..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              className="bg-transparent outline-none w-full text-white placeholder-gray-500"
            />
          </div>

          {/* TABLE */}

          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900">
            {loading ? (
              <div className="p-10 text-center text-gray-400">
                Loading sections...
              </div>
            ) : filteredSections.length ===
              0 ? (
              <div className="p-10 text-center">
                <Layers
                  size={42}
                  className="mx-auto text-gray-600 mb-4"
                />

                <p className="text-gray-400">
                  {search
                    ? "No sections match your search."
                    : "No sections found."}
                </p>

                {!search && (
                  <p className="text-gray-500 text-sm mt-1">
                    Click "Add Section" to
                    create your first
                    section.
                  </p>
                )}
              </div>
            ) : (
              <table className="w-full min-w-[850px]">
                <thead className="border-b border-white/10">
                  <tr className="text-left text-gray-400">
                    <th className="px-6 py-4">
                      Section
                    </th>

                    <th className="px-6 py-4">
                      Department
                    </th>

                    <th className="px-6 py-4">
                      Code
                    </th>

                    <th className="px-6 py-4">
                      Semester
                    </th>

                    <th className="px-6 py-4">
                      Capacity
                    </th>

                    <th className="px-6 py-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSections.map(
                    (section) => {
                      const department =
                        departments.find(
                          (item) =>
                            item.id ===
                            section.departmentId
                        );

                      return (
                        <tr
                          key={section.id}
                          className="border-b border-white/5 hover:bg-white/5 transition"
                        >
                          <td className="px-6 py-5 font-semibold text-cyan-400">
                            {section.name}
                          </td>

                          <td className="px-6 py-5 text-gray-300">
                            {department?.name ||
                              "Unknown"}
                          </td>

                          <td className="px-6 py-5 text-gray-400">
                            {department?.code ||
                              "-"}
                          </td>

                          <td className="px-6 py-5 text-gray-300">
                            Semester{" "}
                            {section.semester}
                          </td>

                          <td className="px-6 py-5 text-gray-400">
                            {section.capacity ??
                              "Not specified"}
                          </td>

                          <td className="px-6 py-5 text-right">
                            <button
                              onClick={() =>
                                handleDelete(
                                  section.id
                                )
                              }
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition"
                              title="Delete section"
                            >
                              <Trash2
                                size={19}
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    }
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
                filteredSections.length
              }
            </span>{" "}
            of{" "}
            <span className="text-gray-300">
              {sections.length}
            </span>{" "}
            sections
          </div>
        </div>
      </section>

      {/* ADD SECTION MODAL */}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8 shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-2xl font-bold">
                  Add Section
                </h2>

                <p className="text-gray-400 text-sm mt-1">
                  Create a section for a
                  department and semester.
                </p>
              </div>

              <button
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
              {/* SECTION NAME */}

              <div>
                <label className="text-sm text-gray-300">
                  Section Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="A"
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
                    departments.length === 0
                  }
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400 disabled:opacity-50"
                >
                  {departments.length ===
                  0 ? (
                    <option>
                      No departments
                      available
                    </option>
                  ) : (
                    departments.map(
                      (department) => (
                        <option
                          key={department.id}
                          value={department.id}
                        >
                          {department.name} (
                          {department.code})
                        </option>
                      )
                    )
                  )}
                </select>
              </div>

              {/* SEMESTER */}

              <div>
                <label className="text-sm text-gray-300">
                  Semester
                </label>

                <select
                  value={semester}
                  onChange={(event) =>
                    setSemester(
                      event.target.value
                    )
                  }
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

              {/* CAPACITY */}

              <div>
                <label className="text-sm text-gray-300">
                  Capacity
                </label>

                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(event) =>
                    setCapacity(
                      event.target.value
                    )
                  }
                  placeholder="60"
                  className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 outline-none focus:border-cyan-400"
                />
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
                    departments.length === 0
                  }
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving
                    ? "Saving..."
                    : "Save Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}