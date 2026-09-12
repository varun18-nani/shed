"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@college.edu");
  const [password, setPassword] = useState("Admin@12345");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // Login successful
      const role = data.user?.role;
      if (role === "ADMIN") {
        window.location.href = "/admin";
      } else if (role === "FACULTY") {
        window.location.href = "/faculty";
      } else if (role === "STUDENT") {
        window.location.href = "/student";
      } else {
        window.location.href = "/admin"; // Fallback just in case
      }
    } catch (error) {
      console.error("Login request failed:", error);
      setError("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-4xl">
          ⇥
        </div>

        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">Welcome Back</h1>

          <p className="mt-3 text-lg text-slate-400">
            Sign in to SchedAI
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 px-5 py-4 text-red-400">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-base font-medium"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-4 text-white outline-none transition focus:border-cyan-500"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-base font-medium"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-4 text-white outline-none transition focus:border-cyan-500"
            />
          </div>

          {/* Forgot password */}
          <div className="text-right">
            <a
              href="/forgot-password"
              className="text-cyan-400 hover:text-cyan-300"
            >
              Forgot password?
            </a>
          </div>

          {/* Sign In */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-4 text-lg font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing In..." : "⇥  Sign In"}
          </button>
        </form>

        {/* Register */}
        <p className="mt-8 text-center text-slate-400">
          Don't have an account?{" "}
          <a
            href="/register"
            className="font-medium text-cyan-400 hover:text-cyan-300"
          >
            Register
          </a>
        </p>
      </div>
    </main>
  );
}