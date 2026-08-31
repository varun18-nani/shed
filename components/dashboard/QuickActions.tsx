import {
  CalendarPlus,
  UserPlus,
  Building2,
  BookPlus,
} from "lucide-react";

const actions = [
  {
    title: "Generate Timetable",
    description: "Create a new college schedule",
    icon: CalendarPlus,
  },
  {
    title: "Add Faculty",
    description: "Register a faculty member",
    icon: UserPlus,
  },
  {
    title: "Add Room",
    description: "Add classroom or laboratory",
    icon: Building2,
  },
  {
    title: "Add Subject",
    description: "Create a new subject",
    icon: BookPlus,
  },
];

export default function QuickActions() {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4">
        Quick Actions
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              className="group text-left p-5 rounded-2xl bg-slate-900 border border-white/10 hover:border-cyan-400/40 hover:bg-cyan-500/5 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                <Icon className="text-cyan-400" size={22} />
              </div>

              <h3 className="font-semibold group-hover:text-cyan-400 transition">
                {action.title}
              </h3>

              <p className="text-sm text-gray-400 mt-1">
                {action.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}