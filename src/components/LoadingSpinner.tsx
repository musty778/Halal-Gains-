const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 flex items-center justify-center">
      <div className="relative flex flex-col items-center">
        {/* Outer spinning ring */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-400 border-r-teal-400 border-b-cyan-400 animate-spin"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-300 border-r-teal-300 opacity-40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>

        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg"></div>
        </div>

        {/* Loading text */}
        <div className="mt-8">
          <p className="text-sm font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner
