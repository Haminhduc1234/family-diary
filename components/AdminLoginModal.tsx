import { Dialog } from "@headlessui/react";
import {
  EnvelopeIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { supabase } from "../utils/supabase";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string) => void;
}

export default function AdminLoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: AdminLoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || loading) return;

    if (!supabase) {
      setErrorMessage("Supabase is not configured in .env.local");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        onLoginSuccess(data.user.email || email);
        handleClose();
      }
    } catch (err: any) {
      console.error("Login error:", err);
      let msg = err.message || "Login failed";
      if (err.message?.includes("Invalid login credentials")) {
        msg = "Invalid email or password.";
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setEmail("");
    setPassword("");
    setErrorMessage(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          static
          open={isOpen}
          onClose={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <Dialog.Overlay
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-xl"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 font-sans w-full max-w-[420px] overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-950/90 p-6 sm:p-7 text-white shadow-2xl backdrop-blur-2xl ring-1 ring-white/10"
          >
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

            {/* Header */}
            <div className="relative flex items-start justify-between pb-5 border-b border-white/10">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/25 to-blue-600/10 border border-blue-500/30 text-blue-400 shadow-inner">
                  <LockClosedIcon className="h-5 w-5" />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-bold tracking-tight text-white">
                    Admin Login
                  </Dialog.Title>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Sign in to manage and upload memories
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="rounded-full p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
              >
                <ExclamationCircleIcon className="h-4 w-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Email
                </label>
                <div className="relative flex items-center">
                  <EnvelopeIcon className="pointer-events-none absolute left-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.04] pl-10 pr-3.5 py-2.5 sm:py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 transition-all duration-150 hover:border-white/25 focus:border-blue-500 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Password
                </label>
                <div className="relative flex items-center">
                  <LockClosedIcon className="pointer-events-none absolute left-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.04] pl-10 pr-11 py-2.5 sm:py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 transition-all duration-150 hover:border-white/25 focus:border-blue-500 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-150 hover:from-blue-500 hover:to-blue-400 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </div>

              <p className="pt-1 text-center text-[11px] text-zinc-500">
                Authorized administrative access only
              </p>
            </form>
          </motion.div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
