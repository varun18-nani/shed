import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">

        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
          SchedAuto
        </h1>

        <ul className="hidden md:flex items-center gap-8 text-gray-300">
          <li className="hover:text-cyan-400 cursor-pointer transition duration-300">
            <Link href="/">Home</Link>
          </li>

          <li className="hover:text-cyan-400 cursor-pointer transition duration-300">
            <Link href="/#features">Features</Link>
          </li>
        </ul>

        <Link href="/login" className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/30 hover:scale-105 transition block">
          Login
        </Link>

      </div>
    </nav>
  );
}