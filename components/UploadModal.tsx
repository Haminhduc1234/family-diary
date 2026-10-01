import { Dialog } from "@headlessui/react";
import {
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PhotoIcon,
  SparklesIcon,
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
  isVideo?: boolean;
  status: "idle" | "uploading" | "success" | "error";
  errorMessage?: string;
  progress: number;
  statusText?: string;
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
  const [autoCompress, setAutoCompress] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: UploadFileItem[] = [];
    const validExtensions = /\.(jpe?g|png|webp|avif|gif)$/i;

    Array.from(files).forEach((file) => {
      if (!validExtensions.test(file.name) && !file.type.startsWith("image/")) {
        return;
      }

      const previewUrl = URL.createObjectURL(file);

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        title: "",
        previewUrl,
        isVideo: false,
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

  const encodeTitleSafe = (title: string): string => {
    try {
      const trimmed = title.trim();
      if (!trimmed) return "";
      const bytes = new TextEncoder().encode(trimmed);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      return `b64_${b64}`;
    } catch (err) {
      console.error("Failed to encode title to base64:", err);
      return "";
    }
  };

  const compressAndGetMediaMeta = async (
    file: File,
    shouldCompress: boolean = true
  ): Promise<{
    fileToUpload: File;
    width: number;
    height: number;
    blurDataUrl: string | null;
    isVideo: boolean;
  }> => {
    const isVideo = file.type.startsWith("video/");
    if (isVideo) {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve({
            fileToUpload: file,
            width: video.videoWidth || 1280,
            height: video.videoHeight || 720,
            blurDataUrl: null,
            isVideo: true,
          });
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({
            fileToUpload: file,
            width: 1280,
            height: 720,
            blurDataUrl: null,
            isVideo: true,
          });
        };
        video.src = url;
      });
    }

    // Nếu là GIF hoặc tắt nén: giữ nguyên file gốc
    if (file.type === "image/gif" || !shouldCompress) {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          const w = img.naturalWidth || 1200;
          const h = img.naturalHeight || 800;
          let blurDataUrl: string | null = null;
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 10;
            canvas.height = Math.max(1, Math.round((h / w) * 10));
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              blurDataUrl = canvas.toDataURL("image/jpeg", 0.7);
            }
          } catch {
            // fallback
          }
          URL.revokeObjectURL(url);
          resolve({ fileToUpload: file, width: w, height: h, blurDataUrl, isVideo: false });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ fileToUpload: file, width: 1200, height: 800, blurDataUrl: null, isVideo: false });
        };
        img.src = url;
      });
    }

    // Nén ảnh thông minh phía client: Giới hạn 2048px (chuẩn 2K cực nét), JPEG chất lượng 85%
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = async () => {
        URL.revokeObjectURL(url);
        const origW = img.naturalWidth || 1200;
        const origH = img.naturalHeight || 800;
        const MAX_DIMENSION = 2048;

        let targetW = origW;
        let targetH = origH;
        if (origW > MAX_DIMENSION || origH > MAX_DIMENSION) {
          if (origW >= origH) {
            targetW = MAX_DIMENSION;
            targetH = Math.round((origH / origW) * MAX_DIMENSION);
          } else {
            targetH = MAX_DIMENSION;
            targetW = Math.round((origW / origH) * MAX_DIMENSION);
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, targetW, targetH);
        }

        let blurDataUrl: string | null = null;
        try {
          const blurCanvas = document.createElement("canvas");
          blurCanvas.width = 10;
          blurCanvas.height = Math.max(1, Math.round((targetH / targetW) * 10));
          const blurCtx = blurCanvas.getContext("2d");
          if (blurCtx) {
            blurCtx.drawImage(canvas, 0, 0, blurCanvas.width, blurCanvas.height);
            blurDataUrl = blurCanvas.toDataURL("image/jpeg", 0.7);
          }
        } catch {
          // ignore
        }

        try {
          const blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob((b) => res(b), "image/jpeg", 0.85)
          );

          if (blob && (blob.size < file.size || origW > MAX_DIMENSION || origH > MAX_DIMENSION)) {
            const newName = file.name.replace(/\.[^/.]+$/, ".jpg");
            const compressedFile = new File([blob], newName, { type: "image/jpeg" });
            return resolve({
              fileToUpload: compressedFile,
              width: targetW,
              height: targetH,
              blurDataUrl,
              isVideo: false,
            });
          }
        } catch {
          // fallback
        }

        resolve({
          fileToUpload: file,
          width: origW,
          height: origH,
          blurDataUrl,
          isVideo: false,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          fileToUpload: file,
          width: 1200,
          height: 800,
          blurDataUrl: null,
          isVideo: false,
        });
      };
      img.src = url;
    });
  };

  const uploadSingleFile = async (item: UploadFileItem, index: number): Promise<boolean> => {
    if (item.status === "success") return true;

    // Giai đoạn 1: Nén và tối ưu hoá ảnh
    setFileList((prev) =>
      prev.map((f) =>
        f.id === item.id
          ? { ...f, status: "uploading", progress: 20, statusText: "Optimizing..." }
          : f
      )
    );

    const meta = await compressAndGetMediaMeta(item.file, autoCompress);

    // Giai đoạn 2: Tải lên lưu trữ
    setFileList((prev) =>
      prev.map((f) =>
        f.id === item.id
          ? { ...f, status: "uploading", progress: 50, statusText: "Uploading..." }
          : f
      )
    );

    const fileToUpload = meta.fileToUpload;
    const userTitle = item.title.trim();
    const titleTag = encodeTitleSafe(userTitle);
    const safeName = fileToUpload.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .toLowerCase();

    let itemIso = new Date().toISOString();
    let timestamp = Date.now();
    if (selectedDate) {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const localDate = new Date(y, m - 1, d, 12, 0, 0);
      const itemDate = new Date(localDate.getTime() + index * 1000);
      itemIso = itemDate.toISOString();
      timestamp = itemDate.getTime();
    }

    const uploadPath = titleTag
      ? `${timestamp}---${titleTag}---${safeName}`
      : `${timestamp}---${safeName}`;

    let uploadSucceeded = false;

    if (supabase) {
      const { error: storageError } = await supabase.storage
        .from(DEFAULT_BUCKET)
        .upload(uploadPath, fileToUpload, {
          contentType: fileToUpload.type || (meta.isVideo ? "video/mp4" : "image/jpeg"),
          upsert: true,
        });

      if (!storageError) {
        uploadSucceeded = true;
        const { data: urlData } = supabase.storage
          .from(DEFAULT_BUCKET)
          .getPublicUrl(uploadPath);

        setFileList((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, progress: 85, statusText: "Saving..." }
              : f
          )
        );

        try {
          const { error: dbErr } = await supabase.from("media").insert({
            title: userTitle,
            storage_path: uploadPath,
            url: urlData.publicUrl,
            type: meta.isVideo ? "video" : "image",
            width: meta.width,
            height: meta.height,
            blur_data_url: meta.blurDataUrl,
            created_at: itemIso,
          });
          if (dbErr) {
            console.warn("[UploadModal] Database insert notice:", dbErr.message);
          }
        } catch (dbEx) {
          console.warn("[UploadModal] Database insert error:", dbEx);
        }
      } else {
        console.warn("Direct upload error, trying API fallback:", storageError.message);
      }
    }

    if (!uploadSucceeded) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(",")[1]);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(fileToUpload);
      const base64Data = await base64Promise;

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: uploadPath,
          fileBase64: base64Data,
          contentType: fileToUpload.type || (meta.isVideo ? "video/mp4" : "image/jpeg"),
          bucket: DEFAULT_BUCKET,
          title: userTitle,
          type: meta.isVideo ? "video" : "image",
          width: meta.width,
          height: meta.height,
          blurDataUrl: meta.blurDataUrl,
          createdAt: itemIso,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload failed");
      }
    }

    setFileList((prev) =>
      prev.map((f) =>
        f.id === item.id
          ? { ...f, status: "success", progress: 100, statusText: "Done" }
          : f
      )
    );
    return true;
  };

  const uploadAll = async () => {
    if (fileList.length === 0 || isUploading) return;

    setIsUploading(true);
    let successCount = 0;

    // Tải song song (Concurrency = 3) để tối ưu tối đa tốc độ mạng
    const CONCURRENCY = 3;
    let nextIndex = 0;
    const itemsToUpload = fileList.map((item, index) => ({ item, index }));

    const worker = async () => {
      while (nextIndex < itemsToUpload.length) {
        const currentIndex = nextIndex++;
        const target = itemsToUpload[currentIndex];
        try {
          const ok = await uploadSingleFile(target.item, target.index);
          if (ok) successCount++;
        } catch (err: any) {
          console.error("Upload error for file:", target.item.file.name, err);
          let msg = err.message || "Upload failed";
          if (
            msg.includes("row-level security") ||
            msg.includes("AccessDenied") ||
            msg.includes("Unauthorized")
          ) {
            msg = "Admin login required to upload.";
          }
          setFileList((prev) =>
            prev.map((f) =>
              f.id === target.item.id
                ? { ...f, status: "error", errorMessage: msg, statusText: "Failed" }
                : f
            )
          );
        }
      }
    };

    const workers = [];
    const activeWorkers = Math.min(CONCURRENCY, itemsToUpload.length);
    for (let w = 0; w < activeWorkers; w++) {
      workers.push(worker());
    }
    await Promise.all(workers);

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
            className="relative z-10 font-sans flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 text-white shadow-2xl backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <ArrowUpTrayIcon className="h-5 w-5" />
                </div>
                <div>
                  <Dialog.Title className="text-base font-semibold">
                    Upload Photos
                  </Dialog.Title>
                  <p className="text-xs text-white/50">
                    Add photos with titles to the timeline
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
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Batch Date Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/25">
                    <CalendarDaysIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white">
                      Timeline Date
                    </label>
                    <p className="text-[11px] text-zinc-400">
                      Select milestone date for all photos in this batch
                    </p>
                  </div>
                </div>
                <input
                  type="date"
                  disabled={isUploading}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-white/15 bg-black/50 px-3 py-1.5 text-base sm:text-xs text-white [color-scheme:dark] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer self-start sm:self-auto"
                />
              </div>

              {/* Smart Compression Option */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    <SparklesIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-white">
                      Smart 2K Compression
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      Auto-resize to sharp 2K quality for 10x faster upload & smaller storage
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={autoCompress}
                    disabled={isUploading}
                    onChange={(e) => setAutoCompress(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-zinc-700 transition peer-checked:bg-blue-600 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-focus:outline-none" />
                </label>
              </div>

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
                  accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white transition group-hover:scale-110">
                  <ArrowUpTrayIcon className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-white">
                  Drag and drop photos here, or{" "}
                  <span className="text-blue-400 underline underline-offset-2">
                    browse photos
                  </span>
                </p>
                <p className="mt-1.5 text-xs text-white/50">
                  Supports JPG, PNG, WEBP, AVIF, GIF
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
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="h-full w-full object-cover"
                            />
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
                              className="w-full rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-base sm:text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                            />
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-white/40">
                              <span className="truncate max-w-[180px]">{item.file.name}</span>
                              <span>&bull;</span>
                              <span>{formatFileSize(item.file.size)}</span>
                              {item.statusText && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-blue-400 font-medium">{item.statusText}</span>
                                </>
                              )}
                            </div>
                            {item.status === "uploading" && (
                              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            )}
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
