"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import {
  Bell,
  Search,
  Plus,
  Trash2,
  Building2,
} from "lucide-react";

type Department = {
  id: string;
  name: string;
  code: string;
  createdAt: string;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadDepartments() {
    try {
      setLoading(true);
      setError("");

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
    } catch (error) {
      console.error("Load departments error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load departments"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim() || !code.trim()) {
      setError(
        "Please enter both department name and code."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create department"
        );
      }

      setSuccess(
        "Department created successfully."
      );

      setName("");
      setCode("");

      await loadDepartments();
    } catch (error) {
      console.error("Create department error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create department"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this department?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/departments", {
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
          data.error || "Failed to delete department"
        );
      }

      setSuccess(
        "Department deleted successfully."
      );

      await loadDepartments();
    } catch (error) {
      console.error("Delete department error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete department"
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
          {/* PAGE HEADER */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">
                Departments
              </h1>

              <p className="text-gray-400 mt-2">
                Manage college departments
              </p>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-xl">
              <span className="text-cyan-400 font-semibold">
                {departments.length}
              </span>

              <span className="text-gray-400 ml-2">
                Departments
              </span>
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

          {/* ADD DEPARTMENT */}
          <div className="mt-8 bg-slate-900 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-cyan-500/10 p-3 rounded-xl">
                <Plus
                  className="text-cyan-400"
                  size={22}
                />
              </div>

              <div>
                <h2 className="text-xl font-semibold">
                  Add Department
                </h2>

                <p className="text-gray-400 text-sm">
                  Create a new academic department
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid md:grid-cols-3 gap-5"
            >
              {/* NAME */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Department Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Computer Science and Engineering"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500"
                />
              </div>

              {/* CODE */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Department Code
                </label>

                <input
                  type="text"
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="CSE"
                  maxLength={10}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500"
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

                  {saving
                    ? "Creating..."
                    : "Create Department"}
                </button>
              </div>
            </form>
          </div>

          {/* DEPARTMENT LIST */}
          <div className="mt-8 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold">
                Department List
              </h2>

              <p className="text-gray-400 text-sm mt-1">
                All departments registered in the system
              </p>
            </div>

            {/* LOADING */}
            {loading ? (
              <div className="p-10 text-center text-gray-400">
                Loading departments...
              </div>
            ) : departments.length === 0 ? (
              /* EMPTY STATE */
              <div className="p-10 text-center">
                <Building2
                  size={40}
                  className="mx-auto text-gray-600 mb-4"
                />

                <p className="text-gray-400">
                  No departments found.
                </p>

                <p className="text-gray-500 text-sm mt-1">
                  Create your first department above.
                </p>
              </div>
            ) : (
              /* TABLE */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-gray-400 text-sm">
                      <th className="px-6 py-4">
                        Department
                      </th>

                      <th className="px-6 py-4">
                        Code
                      </th>

                      <th className="px-6 py-4">
                        Created
                      </th>

                      <th className="px-6 py-4 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {departments.map(
                      (department) => (
                        <tr
                          key={department.id}
                          className="border-b border-white/5 hover:bg-white/5"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="bg-cyan-500/10 p-2 rounded-lg">
                                <Building2
                                  size={20}
                                  className="text-cyan-400"
                                />
                              </div>

                              <span className="font-medium">
                                {department.name}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <span className="bg-slate-800 px-3 py-1 rounded-lg text-cyan-400 font-mono">
                              {department.code}
                            </span>
                          </td>

                          <td className="px-6 py-5 text-gray-400">
                            {new Date(
                              department.createdAt
                            ).toLocaleDateString()}
                          </td>

                          <td className="px-6 py-5 text-right">
                            <button
                              onClick={() =>
                                handleDelete(
                                  department.id
                                )
                              }
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg"
                              title="Delete department"
                            >
                              <Trash2 size={19} />
                            </button>
                          </td>
                        </tr>
                      )
                    )}
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