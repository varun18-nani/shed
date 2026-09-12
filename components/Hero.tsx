import Link from "next/link";

export default function Hero() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center px-6">

      <div className="text-center max-w-4xl">

        <span className="px-4 py-2 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          Automated CVR College Timetable Management
        </span>

        <h1 className="mt-8 text-6xl font-extrabold leading-tight">
          Create
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            {" "}our{" "}
          </span>
          college schedule without
          <br />
          any Stress
        </h1>

        <p className="mt-8 text-gray-400 text-xl">
          Now manage faculty, classrooms, labs, departments and schedules
          in digital version.
        </p>

        <div className="mt-10 flex justify-center gap-5">

          <Link href="/login" className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-105 duration-300 block">
            Get Started
          </Link>

          <Link href="/login" className="px-8 py-4 rounded-xl border border-gray-700 hover:border-cyan-500 duration-300 block">
            Live Demo
          </Link>

        </div>

      </div>

    </section>
  );
}