import { Dialog } from "@headlessui/react";
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  FilmIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { supabase } from "../utils/supabase";
import { DEFAULT_BUCKET } from "../utils/supabaseStorage";

interface UploadFileItem {
  id: string;
  file: File;
  title: string;
  previewUrl: string;
  isVideo: boolean;
  status: "idle" | "uploading" | "success" | "error";
  errorMessage?: string;
  progress: number;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadModalProps) {
  const [fileList, setFileList] = useState<UploadFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: UploadFileItem[] = [];
    const validExtensions = /\.(jpe?g|png|webp|avif|gif|mp4|webm|mov|m4v|ogg)$/i;

    Array.from(files).forEach((file) => {
      if (!validExtensions.test(file.name) && !file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        return;
      }

      const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);
      const previewUrl = URL.createObjectURL(file);
      const defaultTitle = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .trim();

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        title: defaultTitle,
        previewUrl,
        isVideo,
        status: "idle",
        progress: 0,
      });
    });

    setFileList((prev) => [...prev, ...newItems]);
  }, []);

  const updateFileTitle = (id: string, newTitle: string) => {
    setFileList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, title: newTitle } : f))
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeFile = (id: string) => {
    setFileList((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const uploadAll = async () => {
    if (fileList.length === 0 || isUploading) return;

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const item = fileList[i];
      if (item.status === "success") {
        successCount++;
        continue;
      }

      setFileList((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", progress: 30 } : f))
      );

      try {
        const file = item.file;
        const timestamp = Date.now();
        const userTitle = item.title.trim() || file.name.replace(/\.[^/.]+$/, "");
        const safeTitle = encodeURIComponent(userTitle.replace(/\s+/g, "_"));
        const safeName = file.name
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .toLowerCase();
        // Path format: timestamp---customTitle---filename
        const uploadPath = `${timestamp}---${safeTitle}---${safeName}`;

        let uploadSucceeded = false;

        // Try direct browser client upload first (efficient, no size limits)
        if (supabase) {
          const { error } = await supabase.storage
            .from(DEFAULT_BUCKET)
            .upload(uploadPath, file, {
              contentType: file.type || "application/octet-stream",
              upsert: true,
            });

          if (!error) {
            uploadSucceeded = true;
          } else {
            console.warn("Direct upload error, trying API fallback:", error.message);
          }
        }

        // Fallback to API route if direct upload was not successful or client key missing
        if (!uploadSucceeded) {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const res = reader.result as string;
              resolve(res.split(",")[1]);
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(file);
          const base64Data = await base64Promise;

          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: uploadPath,
              fileBase64: base64Data,
              contentType: file.type,
              bucket: DEFAULT_BUCKET,
            }),
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Upload failed");
          }
        }

        setFileList((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "success", progress: 100 } : f))
        );
        successCount++;
      } catch (err: any) {
        console.error("Upload error for file:", item.file.name, err);
        let msg = err.message || "Upload failed";
        if (msg.includes("row-level security") || msg.includes("AccessDenied") || msg.includes("Unauthorized")) {
          msg = "Admin login required to upload.";
        }
        setFileList((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: "error", errorMessage: msg }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      onUploadSuccess();
      setTimeout(() => {
        if (successCount === fileList.length) {
          handleClose();
        }
      }, 1000);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    fileList.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setFileList([]);
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
            className="fixed inset-0 bg-black/80 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 text-white shadow-2xl backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <ArrowUpTrayIcon className="h-5 w-5" />
                </div>
                <div>
                  <Dialog.Title className="text-base font-semibold">
                    Upload Media
                  </Dialog.Title>
                  <p className="text-xs text-white/50">
                    Add photos or videos with titles to the timeline
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                  isDragging
                    ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                    : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/[0.07]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/mp4,video/webm,video/quicktime,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white transition group-hover:scale-110">
                  <ArrowUpTrayIcon className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-white">
                  Drag and drop media here, or{" "}
                  <span className="text-blue-400 underline underline-offset-2">
                    browse files
                  </span>
                </p>
                <p className="mt-1.5 text-xs text-white/50">
                  Supports JPG, PNG, WEBP, GIF, MP4, WEBM, MOV
                </p>
              </div>

              {/* File list preview */}
              {fileList.length > 0 && (
                <div className="mt-6 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>Selected files ({fileList.length})</span>
                    {!isUploading && (
                      <button
                        onClick={() => {
                          fileList.forEach((f) => URL.revokeObjectURL(f.previewUrl));
                          setFileList([]);
                        }}
                        className="text-white/50 hover:text-red-400 transition"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                    {fileList.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                          {/* Thumbnail / Icon */}
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-800 flex items-center justify-center border border-white/10">
                            {item.isVideo ? (
                              <FilmIcon className="h-6 w-6 text-zinc-400" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.previewUrl}
                                alt={item.file.name}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>

                          {/* Title input field */}
                          <div className="flex-1 overflow-hidden">
                            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1 font-semibold">
                              Title:
                            </label>
                            <input
                              type="text"
                              disabled={isUploading}
                              value={item.title}
                              onChange={(e) => updateFileTitle(item.id, e.target.value)}
                              placeholder="Enter title..."
                              className="w-full rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                            />
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-white/40">
                              <span className="truncate max-w-[180px]">{item.file.name}</span>
                              <span>&bull;</span>
                              <span>{formatFileSize(item.file.size)}</span>
                              <span>&bull;</span>
                              <span>{item.isVideo ? "Video" : "Photo"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status / Action */}
                        <div className="flex items-center gap-2 self-end sm:self-center pl-2">
                          {item.status === "uploading" && (
                            <svg
                              className="h-5 w-5 animate-spin text-blue-400"
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
                          )}
                          {item.status === "success" && (
                            <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
                          )}
                          {item.status === "error" && (
                            <div title={item.errorMessage}>
                              <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                            </div>
                          )}
                          {item.status === "idle" && !isUploading && (
                            <button
                              onClick={() => removeFile(item.id)}
                              className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition"
                              title="Remove"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-6 py-4">
              <span className="text-xs text-white/50">
                {fileList.length > 0
                  ? `${fileList.filter((f) => f.status === "success").length}/${fileList.length} uploaded`
                  : "No files selected"}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleClose}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={fileList.length === 0 || isUploading}
                  onClick={uploadAll}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {isUploading ? (
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
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpTrayIcon className="h-4 w-4" />
                      <span>Upload ({fileList.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
