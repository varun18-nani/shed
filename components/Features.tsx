import { Brain, CalendarDays, Download, Shield } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: <CalendarDays size={40} className="text-cyan-400" />,
      title: "Automatic Scheduling",
      desc: "Generate conflict-free timetables within minutes."
    },
    {
      icon: <Brain size={40} className="text-purple-400" />,
      title: "Smart Algorithms",
      desc: "Optimized scheduling using intelligent algorithms."
    },
    {
      icon: <Download size={40} className="text-green-400" />,
      title: "Export Anywhere",
      desc: "Download timetables as PDF, Excel and more."
    },
    {
      icon: <Shield size={40} className="text-orange-400" />,
      title: "Secure Platform",
      desc: "Role-based authentication and secure data management."
    }
  ];

  return (
    <section id="features" className="bg-black text-white py-24 px-6">

      <div className="max-w-6xl mx-auto">

        <h2 className="text-5xl font-bold text-center mb-4">
          Powerful Features
        </h2>

        <p className="text-center text-gray-400 mb-16">
          Everything required to manage college scheduling professionally.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

          {features.map((feature, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 hover:scale-105 transition duration-300"
            >
              {feature.icon}

              <h3 className="text-2xl font-semibold mt-6">
                {feature.title}
              </h3>

              <p className="text-gray-400 mt-3">
                {feature.desc}
              </p>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
}