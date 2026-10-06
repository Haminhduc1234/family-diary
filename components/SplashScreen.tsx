import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden bg-slate-50 dark:bg-[#08090d] transition-colors duration-300"
          title="Nhấp để vào ngay"
        >
          {/* Center Content Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center px-6 max-w-md w-full text-center"
            onClick={(e) => {
              dismiss();
            }}
          >
            {/* Minimalist Standalone Pulsating Heart Icon */}
            <motion.div
              animate={{
                scale: [1, 1.12, 1],
                opacity: [0.82, 1, 0.82],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.6,
                ease: "easeInOut",
              }}
              className="mb-6 flex items-center justify-center"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-16 w-16 sm:h-20 sm:w-20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="url(#heart-grad)"
                />
              </svg>
            </motion.div>

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
