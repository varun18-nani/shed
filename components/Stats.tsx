import { GraduationCap, Users, Building2, Clock } from "lucide-react";

export default function Stats() {
  return (
    <section className="bg-slate-950 text-white py-20">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-6">

        <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10 hover:scale-105 transition">
          <GraduationCap className="mx-auto text-cyan-400 mb-4" size={40}/>
          <h2 className="text-3xl font-bold">500+</h2>
          <p className="text-gray-400">Colleges</p>
        </div>

        <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10 hover:scale-105 transition">
          <Users className="mx-auto text-purple-400 mb-4" size={40}/>
          <h2 className="text-3xl font-bold">10K+</h2>
          <p className="text-gray-400">Faculty</p>
        </div>

        <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10 hover:scale-105 transition">
          <Building2 className="mx-auto text-blue-400 mb-4" size={40}/>
          <h2 className="text-3xl font-bold">2000+</h2>
          <p className="text-gray-400">Departments</p>
        </div>

        <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10 hover:scale-105 transition">
          <Clock className="mx-auto text-green-400 mb-4" size={40}/>
          <h2 className="text-3xl font-bold">5 Min</h2>
          <p className="text-gray-400">Schedule Time</p>
        </div>

      </div>
    </section>
  );
}