import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SparklesIcon, HeartIcon } from "@heroicons/react/24/solid";

interface SplashScreenProps {
  /** Optional callback when splash screen finishes */
  onFinish?: () => void;
  /** Minimum duration in ms before closing (default: 2000ms) */
  minDuration?: number;
}

export default function SplashScreen({
  onFinish,
  minDuration = 2100,
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState("Đang mở trang kỷ niệm...");

  const dismiss = React.useCallback(() => {
    setIsVisible(false);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
    if (onFinish) onFinish();
  }, [onFinish]);

  useEffect(() => {
    // Prevent body scrolling while splash screen is active
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        dismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const startTime = performance.now();
    const interval = 25; // 25ms tick

    const timer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const rawRatio = Math.min(elapsed / minDuration, 1);

      // Smooth easeOutQuad progress curve
      const easedRatio = 1 - Math.pow(1 - rawRatio, 2.2);
      const currentPercent = Math.min(Math.round(easedRatio * 100), 100);

      setProgress(currentPercent);

      if (currentPercent < 35) {
        setStageText("Đang khởi tạo không gian kỷ niệm...");
      } else if (currentPercent < 75) {
        setStageText("Tải những khoảnh khắc yêu thương...");
      } else if (currentPercent < 98) {
        setStageText("Chuẩn bị hoàn tất...");
      } else {
        setStageText("Chào mừng!");
      }

      if (elapsed >= minDuration) {
        clearInterval(timer);
        setProgress(100);
        setStageText("Chào mừng!");
        // Hold at 100% for 220ms for sweet visual closure
        setTimeout(() => {
          dismiss();
        }, 220);
      }
    }, interval);

    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [minDuration, dismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="family-splash-screen"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: "blur(10px)",
            transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
          }}
          onClick={dismiss}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden bg-slate-50/95 dark:bg-[#08090d]/95 backdrop-blur-2xl transition-colors duration-300"
          title="Nhấp để vào ngay"
        >
          {/* Ambient Lighting Orbs */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-600/20 animate-pulse" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-rose-500/15 blur-3xl dark:bg-rose-500/20 animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/15" />

          {/* Micro-dot grid texture */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)] opacity-40" />

          {/* Center Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center px-6 max-w-md w-full text-center"
            onClick={(e) => {
              // Click anywhere on card still triggers dismiss
              dismiss();
            }}
          >
            {/* Glowing Icon Badge Area */}
            <div className="relative mb-6">
              {/* Outer Glowing Ripple Wave */}
              <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-tr from-blue-500/30 via-indigo-500/30 to-rose-500/30 blur-xl opacity-70 animate-pulse" />
              <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-tr from-blue-500 to-rose-500 opacity-30 blur-sm" />

              {/* Main Mascot / Icon Emblem */}
              <motion.div
                animate={{
                  y: [0, -6, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: "easeInOut",
                }}
                className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-3xl bg-gradient-to-b from-white/90 to-white/60 dark:from-zinc-900/90 dark:to-zinc-950/70 p-3 shadow-2xl border border-white/60 dark:border-white/10 backdrop-blur-xl flex items-center justify-center group"
              >
                {/* Custom Heartwarming Family SVG */}
                <svg
                  viewBox="0 0 128 128"
                  className="w-full h-full drop-shadow-md"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="splash-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                    <linearGradient id="splash-heart" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff4b72" />
                      <stop offset="100%" stopColor="#f43f5e" />
                    </linearGradient>
                    <filter id="splash-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" floodColor="#f43f5e" />
                    </filter>
                  </defs>

                  {/* Rounded squircle inner plate */}
                  <rect width="128" height="128" rx="28" fill="url(#splash-bg)" />

                  {/* Glass rim reflection */}
                  <rect
                    x="2"
                    y="2"
                    width="124"
                    height="124"
                    rx="26"
                    fill="none"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="2"
                  />

                  {/* Heart with pulse wave effect */}
                  <g filter="url(#splash-glow)">
                    <path
                      d="M64 18 C60 11.5 51.5 11.5 47 17.5 C41 25.5 52.5 35 64 43 C75.5 35 87 25.5 81 17.5 C76.5 11.5 68 11.5 64 18 Z"
                      fill="url(#splash-heart)"
                    />
                  </g>

                  {/* Left Parent (Warm white silhouette) */}
                  <circle cx="36" cy="46" r="11" fill="#ffffff" />
                  <path
                    d="M19 98 C19 77 28 68 42 68 C48.5 68 53.5 72 55.5 76 C48 81.5 45 88.5 45 98 Z"
                    fill="#ffffff"
                  />

                  {/* Right Parent (Warm white silhouette) */}
                  <circle cx="92" cy="46" r="11" fill="#ffffff" />
                  <path
                    d="M109 98 C109 77 100 68 86 68 C79.5 68 74.5 72 72.5 76 C80 81.5 83 88.5 83 98 Z"
                    fill="#ffffff"
                  />

                  {/* Center Child nestled warmly in between */}
                  <circle cx="64" cy="61" r="9" fill="#ffffff" />
                  <path
                    d="M49 98 C49 84 54.5 78 64 78 C73.5 78 79 84 79 98 Z"
                    fill="#ffffff"
                  />

                  {/* Twinkle Star accent */}
                  <path
                    d="M106 18 Q108 24 114 26 Q108 28 106 34 Q104 28 98 26 Q104 24 106 18 Z"
                    fill="#fef08a"
                  />
                  <path
                    d="M22 24 Q23.5 28 28 29.5 Q23.5 31 22 35 Q20.5 31 16 29.5 Q20.5 28 22 24 Z"
                    fill="#fef08a"
                  />
                </svg>

                {/* Floating Heart micro-badge */}
                <motion.div
                  animate={{
                    scale: [1, 1.25, 1, 1.2, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.6,
                    ease: "easeInOut",
                  }}
                  className="absolute -top-2.5 -right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 border-2 border-white dark:border-zinc-900"
                >
                  <HeartIcon className="h-4 w-4" />
                </motion.div>
              </motion.div>
            </div>

            {/* Title & Emotional Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="space-y-1.5 mb-6"
            >
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 via-indigo-900 to-blue-700 dark:from-white dark:via-zinc-100 dark:to-blue-300 bg-clip-text text-transparent">
                Memories of my family
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                Nơi lưu giữ từng khoảnh khắc đong đầy yêu thương
              </p>
            </motion.div>

            {/* Sleek Progress Bar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="w-full max-w-[280px] space-y-2 mb-6"
            >
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 p-0.5 border border-zinc-300/40 dark:border-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500 shadow-sm shadow-blue-500/50"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>

              {/* Status and Percentage */}
              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 dark:text-zinc-500 px-0.5">
                <span className="truncate pr-2">{stageText}</span>
                <span className="font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">
                  {progress}%
                </span>
              </div>
            </motion.div>

            {/* Bottom Skip / Enter Early Hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="text-[11px] text-zinc-400/80 dark:text-zinc-500/80 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              Nhấn bất kỳ đâu để vào ngay &rarr;
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
