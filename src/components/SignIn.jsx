export default function SignIn({ onClose }) {
  return (
    <div className="flex items-center justify-center min-h-screen fixed inset-0 z-50">
      
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>

      <div className="relative z-10 rounded-2xl bg-white/50 shadow-lg w-full  max-w-xl px-8 py-12 text-center">
        <button className="absolute top-4 right-4 text-gray-500 hover:text-black text-2xl" onClick={onClose}>&times;</button>

        <h2 className="text-3xl font-bold mb-3">Sign in</h2>
        <p className="text-gray-600 text-sm mb-6">
          Enter your email and we’ll send you a verification code
        </p>

        <input
          type="email"
          placeholder="Enter your email address..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />

        <button className="w-full bg-gradient-to-r from-[#C5703F] to-[#C16A00] text-white font-semibold py-2 rounded-lg hover:from-[#C5703F]/90 hover:to-[#C16A00]/90 transition">
          Continue →
        </button>

        <p className="text-xs text-left text-gray-500 mt-4 cursor-pointer hover:underline">
          Privacy Policy
        </p>
      </div>
    </div>
  );
}
