    export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center font-bold text-white">
        S
      </div>

      <div>
        <h1 className="text-xl font-bold text-white">
          SchedAuto
        </h1>

        <p className="text-xs text-gray-400">
          College Management Platform
        </p>
      </div>
    </div>
  );
}