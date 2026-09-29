import { Dialog } from "@headlessui/react";
import {
  CalendarDaysIcon,
  FilmIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ImageProps } from "../utils/types";
import { supabase } from "../utils/supabase";

interface EditMediaModalProps {
  isOpen: boolean;
  item: ImageProps | null;
  onClose: () => void;
  onSaveSuccess: (updated: ImageProps) => void;
}

export default function EditMediaModal({
  isOpen,
  item,
  onClose,
  onSaveSuccess,
}: EditMediaModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      if (item.createdAt) {
        try {
          const d = new Date(item.createdAt);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          setDate(`${y}-${m}-${day}`);
        } catch {
          setDate("");
        }
      } else {
        setDate("");
      }
      setErrorMessage(null);
    }
  }, [item]);

  if (!item) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      let newCreatedAt = item.createdAt;
      if (date) {
        const [y, m, d] = date.split("-").map(Number);
        const localDate = new Date(y, m - 1, d, 12, 0, 0);
        newCreatedAt = localDate.toISOString();
      }

      const storagePath = item.rawName || item.title || "";
      let updateSucceeded = false;

      // 1. Try direct Supabase client update first
      if (supabase) {
        const { error: dbError } = await supabase
          .from("media")
          .update({
            title: title.trim(),
            created_at: newCreatedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("storage_path", storagePath);

        if (!dbError) {
          updateSucceeded = true;
        }
      }

      // 2. Fallback to API route if direct client update failed or client key missing
      if (!updateSucceeded) {
        const res = await fetch("/api/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storage_path: storagePath,
            title: title.trim(),
            created_at: newCreatedAt,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to update media.");
        }
      }

      // Format updated date for immediate display
      let formattedDate = item.formattedDate;
      if (newCreatedAt) {
        try {
          const d = new Date(newCreatedAt);
          formattedDate = d.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        } catch {}
      }

      const updatedItem: ImageProps = {
        ...item,
        title: title.trim(),
        createdAt: newCreatedAt,
        formattedDate,
      };

      onSaveSuccess(updatedItem);
      onClose();
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMessage(err.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          static
          open={isOpen}
          onClose={isSaving ? () => {} : onClose}
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
            className="relative z-10 font-sans w-full max-w-lg overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-950/90 p-6 sm:p-7 text-white shadow-2xl backdrop-blur-2xl ring-1 ring-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  <PencilSquareIcon className="h-5 w-5" />
                </div>
                <div>
                  <Dialog.Title className="text-base font-bold text-white">
                    Edit Memory
                  </Dialog.Title>
                  <p className="text-xs text-zinc-400">
                    Update title and timeline date
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isSaving}
                className="rounded-full p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSave} className="mt-5 space-y-4">
              {/* Media Thumbnail & Meta Preview */}
              <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center">
                  {item.type === "video" ? (
                    <div className="flex flex-col items-center gap-1 text-zinc-400">
                      <FilmIcon className="h-6 w-6 text-blue-400" />
                      <span className="text-[9px] uppercase font-semibold">Video</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.title || "Preview"}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 overflow-hidden text-xs">
                  <p className="font-medium text-white truncate max-w-[260px]">
                    {item.title || "Untitled"}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-[260px]">
                    {item.rawName}
                  </p>
                </div>
              </div>

              {/* Title Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter title (optional)..."
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 transition-all duration-150 hover:border-white/25 focus:border-blue-500 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Timeline Date Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Timeline Date
                </label>
                <div className="relative flex items-center">
                  <CalendarDaysIcon className="pointer-events-none absolute left-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.04] pl-10 pr-3.5 py-2.5 text-base sm:text-sm text-white [color-scheme:dark] transition-all duration-150 hover:border-white/25 focus:border-blue-500 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={onClose}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSaving ? (
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
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
