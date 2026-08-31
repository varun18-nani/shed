import {
  Users,
  CalendarDays,
  Building2,
  BookOpen,
} from "lucide-react";

export default function DashboardPreview() {
  return (
    <section className="bg-slate-950 py-24 px-6 text-white">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold">
            One Platform.
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              {" "}Three Dashboards
            </span>
          </h2>

          <p className="text-gray-400 mt-5 text-lg">
            A centralized platform for administrators, faculty members, and students.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          <div className="rounded-3xl border border-cyan-500/20 bg-white/5 backdrop-blur-xl p-8 hover:-translate-y-2 transition duration-300">
            <Users className="text-cyan-400 mb-5" size={45} />

            <h3 className="text-2xl font-bold">
              Admin Dashboard
            </h3>

            <p className="text-gray-400 mt-4">
              Manage departments, faculty, rooms, subjects, semesters,
              timetable generation and complete college administration.
            </p>
          </div>

          <div className="rounded-3xl border border-purple-500/20 bg-white/5 backdrop-blur-xl p-8 hover:-translate-y-2 transition duration-300">
            <BookOpen className="text-purple-400 mb-5" size={45} />

            <h3 className="text-2xl font-bold">
              Faculty Dashboard
            </h3>

            <p className="text-gray-400 mt-4">
              View teaching schedule, attendance, assigned subjects,
              classrooms, notifications and workload.
            </p>
          </div>

          <div className="rounded-3xl border border-blue-500/20 bg-white/5 backdrop-blur-xl p-8 hover:-translate-y-2 transition duration-300">
            <CalendarDays className="text-blue-400 mb-5" size={45} />

            <h3 className="text-2xl font-bold">
              Student Dashboard
            </h3>

            <p className="text-gray-400 mt-4">
              Access personal timetable, assignments, attendance,
              academic calendar, notices and classroom details.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}