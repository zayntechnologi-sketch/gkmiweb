import React, { useState } from "react";
import { Lock, User, Eye, EyeOff, Shield, AlertCircle, LogIn } from "lucide-react";

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<string | null>;
  onBack: () => void;
}

export default function LoginView({ onLogin, onBack }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError(null);
    const err = await onLogin(username.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-700/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl" />
        {/* Grid dots pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
            backgroundSize: "32px 32px"
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Card */}
        <div
          className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${shake ? "animate-[shake_0.4s_ease]" : ""}`}
        >
          {/* Top gradient accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

          <div className="p-8 sm:p-10">
            {/* Logo / Brand */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <div className="h-16 w-16 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg shadow-indigo-600/40 bg-white">
                  <img src="/gkmi.svg" alt="Logo GKMI ICHTUS" className="h-14 w-14 object-contain" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Shield className="h-3 w-3 text-indigo-400" />
                </div>
              </div>
              <h1 className="font-display text-2xl font-extrabold text-white tracking-tight mt-2">Panel Admin</h1>
              <p className="text-sm text-slate-400 mt-1">GKMI ICHTUS · Manajemen Konten</p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-5 flex items-center space-x-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="admin-username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="admin-password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-12 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id="btn-login-admin"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2.5 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-[0.98] cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white/80" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Masuk ke Panel Admin</span>
                  </>
                )}
              </button>
            </form>

            {/* Back link */}
            <div className="mt-6 text-center">
              <button
                onClick={onBack}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                ← Kembali ke Website
              </button>
            </div>
          </div>
        </div>

        {/* Security note */}
        <p className="mt-4 text-center text-xs text-slate-600">
          Akses terbatas untuk administrator gereja
        </p>
      </div>

      {/* Shake keyframe via inline style tag */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
