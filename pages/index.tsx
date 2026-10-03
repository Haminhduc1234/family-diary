import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  ArrowUpIcon,
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  FilmIcon,
  GlobeAltIcon,
  LockClosedIcon,
  PencilSquareIcon,
  RectangleStackIcon,
  TrashIcon,
  ViewColumnsIcon,
} from "@heroicons/react/24/outline";
import Modal from "../components/Modal";
import UploadModal from "../components/UploadModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import AdminLoginModal from "../components/AdminLoginModal";
import EditMediaModal from "../components/EditMediaModal";
import ThemeToggle from "../components/ThemeToggle";
import getResults from "../utils/cachedImages";
import type { ImageProps } from "../utils/types";
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto";
import { supabase } from "../utils/supabase";

const VIETNAMESE_WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function formatTimelineDate(date: Date): string {
  const weekday = VIETNAMESE_WEEKDAYS[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${weekday}, ${day}/${month}/${year}`;
}

interface TimelineGroup {
  dateKey: string;
  displayDate: string;
  items: ImageProps[];
}

type ViewMode = "masonry" | "large";

const Home: NextPage = ({ images = [] }: { images: ImageProps[] }) => {
  const router = useRouter();
  const { photoId } = router.query;
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();

  const [mediaList, setMediaList] = useState<ImageProps[]>(images);
  const [user, setUser] = useState<any>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ImageProps | null>(null);
  const [editingItem, setEditingItem] = useState<ImageProps | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("masonry");

  const lastViewedPhotoRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("gallery_view_mode") as ViewMode | null;
      if (savedMode === "masonry" || savedMode === "large") {
        setViewMode(savedMode);
      }
    } catch { }
  }, []);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("gallery_view_mode", mode);
    } catch { }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    setMediaList(images);
    refreshMedia(false);
  }, [images]);

  // Supabase Auth listener
  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (lastViewedPhoto && !photoId) {
      lastViewedPhotoRef.current?.scrollIntoView({ block: "center" });
      setLastViewedPhoto(null);
    }
  }, [photoId, lastViewedPhoto, setLastViewedPhoto]);

  // Group media by Timeline date
  const timelineGroups: TimelineGroup[] = useMemo(() => {
    const groupsMap = new Map<string, { displayDate: string; items: ImageProps[] }>();

    mediaList.forEach((item) => {
      let dateKey = "Uncategorized";
      let displayDate = "Moments";

      if (item.createdAt) {
        try {
          const d = new Date(item.createdAt);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            dateKey = `${y}-${m}-${day}`;
            displayDate = formatTimelineDate(d);
          }
        } catch {
          // fallback
        }
      }

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, { displayDate, items: [] });
      }
      groupsMap.get(dateKey)!.items.push(item);
    });

    return Array.from(groupsMap.entries()).map(([dateKey, value]) => ({
      dateKey,
      displayDate: value.displayDate,
      items: value.items,
    }));
  }, [mediaList]);

  // Scoped media items of that day for the modal carousel
  const activeDayImages = useMemo(() => {
    if (!photoId) return [];
    const targetId = Number(photoId);
    const activeGroup = timelineGroups.find((group) =>
      group.items.some((item) => item.id === targetId)
    );
    return activeGroup ? activeGroup.items : mediaList;
  }, [photoId, timelineGroups, mediaList]);

  const refreshMedia = async (force: boolean = false) => {
    try {
      const res = await fetch(`/api/media${force ? "?refresh=true" : ""}`);
      if (res.ok) {
        const data = await res.json();
        if (data.images) {
          setMediaList(data.images);
        }
      }
    } catch (err) {
      console.error("Failed to refresh gallery media:", err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
      showToast("Signed out successfully.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const filename = deletingItem.rawName || deletingItem.title;
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }

      setMediaList((prev) => prev.filter((item) => item.id !== deletingItem.id));
      setDeletingItem(null);
      showToast("Item deleted successfully.");
      await refreshMedia(true);
    } catch (err: any) {
      alert("Failed to delete item: " + (err.message || "Unknown error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteFromModal = async (id: number, filename: string) => {
    const target = mediaList.find((m) => m.id === id);
    const targetFilename = target?.rawName || filename;

    const res = await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: targetFilename }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Delete failed");
    }

    setMediaList((prev) => prev.filter((item) => item.id !== id));
    router.push("/", undefined, { shallow: true });
    showToast("Item deleted successfully.");
    await refreshMedia(true);
  };

  return (
    <>
      <Head>
        <title>Family Diary</title>
        <meta
          name="description"
          content="A visual timeline of family memories"
        />
        <meta property="og:title" content="Family Diary" />
      </Head>

      <main className="mx-auto min-h-screen max-w-7xl px-3 py-3 sm:px-6 lg:px-8">
        {/* Ambient Atmospheric Background */}
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          {/* Light theme ambient auras */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[850px] rounded-full bg-gradient-to-r from-blue-400/15 via-indigo-300/15 to-purple-300/10 blur-3xl dark:hidden" />
          <div className="absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl dark:hidden" />
          <div className="absolute top-2/3 -right-32 h-80 w-80 rounded-full bg-amber-100/25 blur-3xl dark:hidden" />

          {/* Dark theme ambient glows */}
          <div className="hidden dark:block absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[950px] rounded-full bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-violet-800/10 blur-[120px]" />
          <div className="hidden dark:block absolute top-1/3 -left-40 h-80 w-80 rounded-full bg-blue-900/15 blur-[100px]" />
          <div className="hidden dark:block absolute top-2/3 -right-40 h-80 w-80 rounded-full bg-purple-900/15 blur-[100px]" />

          {/* Micro-dot grid texture */}
          <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] opacity-60" />
        </div>

        {photoId && (
          <Modal
            images={activeDayImages}
            onClose={() => {
              setLastViewedPhoto(photoId);
            }}
            onDeletePhoto={user ? handleDeleteFromModal : undefined}
            onEditPhoto={user ? (item) => setEditingItem(item) : undefined}
          />
        )}

        {/* Enhanced Modern Header (Original Style with Refined Colors) */}
        <header className="relative mb-2 sm:mb-10 pb-4 sm:pb-8">
          {/* Subtle Ambient Glows */}
          <div className="pointer-events-none absolute -top-10 left-8 -z-10 h-32 w-64 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/15" />
          <div className="pointer-events-none absolute -top-10 right-8 -z-10 h-32 w-64 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/15" />

          <div className="flex items-center justify-between gap-3 sm:gap-4">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-2.5 sm:gap-4 shrink-0 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight whitespace-nowrap bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
                    Memories of
                  </h1>
                  {mediaList.length > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-400 whitespace-nowrap">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span>{mediaList.length} moments</span>
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-normal whitespace-nowrap truncate max-w-[240px] sm:max-w-none">
                  my family
                </p>
              </div>
            </div>

            {/* Right Action Controls Island */}
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-zinc-200/80 bg-white/70 p-1 sm:p-1.5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-none shrink-0">
              {/* 2 View Mode Switcher Pill */}
              <div className="flex items-center rounded-lg bg-zinc-100/90 p-0.5 dark:bg-white/10">
                <button
                  onClick={() => changeViewMode("masonry")}
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-all ${viewMode === "masonry"
                    ? "bg-white text-blue-600 shadow-xs dark:bg-zinc-800 dark:text-blue-400"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  title="Dòng chảy tự nhiên (Masonry)"
                  aria-label="Masonry View"
                >
                  <ViewColumnsIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => changeViewMode("large")}
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-all ${viewMode === "large"
                    ? "bg-white text-blue-600 shadow-xs dark:bg-zinc-800 dark:text-blue-400"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  title="Nhật ký khổ lớn (Journal View)"
                  aria-label="Journal View"
                >
                  <RectangleStackIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="h-4 w-px bg-zinc-200 dark:bg-white/10" />

              <ThemeToggle />

              {user ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-zinc-50 px-2 sm:px-2.5 py-1 text-xs font-medium text-emerald-600 dark:border-white/10 dark:bg-white/5 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="hidden sm:inline truncate max-w-[120px] md:max-w-[160px]">{user.email}</span>
                    <span className="sm:hidden font-semibold text-[11px]">Admin</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200/80 bg-white text-zinc-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:shadow-none dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    title="Log out"
                    aria-label="Log out"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-white text-zinc-600 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:shadow-none dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white"
                  title="Admin Login"
                  aria-label="Admin Login"
                >
                  <GlobeAltIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Divider with Gradient Accent */}
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-200/90 dark:via-white/10 to-transparent" />
          <div className="absolute -bottom-px left-1/4 h-[2px] w-28 sm:w-40 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent blur-[0.5px]" />
        </header>

        {/* Timeline Container */}
        {timelineGroups.length > 0 ? (
          <div className="relative ml-2 sm:ml-6 pl-5 sm:pl-8">
            {timelineGroups.map((group, groupIndex) => {
              const isLast = groupIndex === timelineGroups.length - 1;
              return (
                <section
                  key={group.dateKey}
                  className="group/section relative pb-6 sm:pb-12 last:pb-2"
                >
                  {/* Segment connecting line fading from this node down to the next */}
                  {!isLast ? (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-5 sm:-left-8 -translate-x-1/2 top-3.5 -bottom-2.5 w-px bg-gradient-to-b from-blue-500/80 via-blue-400/30 to-blue-500/10 dark:from-blue-400/80 dark:via-blue-500/25 dark:to-blue-400/10"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-5 sm:-left-8 -translate-x-1/2 top-3.5 h-28 w-px bg-gradient-to-b from-blue-500/80 via-blue-400/25 to-transparent dark:from-blue-400/80 dark:via-blue-500/20 dark:to-transparent"
                    />
                  )}

                  {/* Delicate thin timeline node */}
                  <div className="absolute -left-5 sm:-left-8 -translate-x-1/2 top-2 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white dark:bg-[#090a0f] ring-[1.5px] ring-blue-500/80 dark:ring-blue-400/80 shadow-xs transition-transform duration-200 group-hover/section:scale-110">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                  </div>

                  {/* Sticky Date milestone label */}
                  <div className="sticky top-2 sm:top-4 z-20 mb-2 sm:mb-5 flex items-center py-1">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white/95 px-3 py-1.5 shadow-md shadow-zinc-900/5 backdrop-blur-xl transition hover:border-blue-400/40 dark:border-white/15 dark:bg-zinc-900/95 dark:shadow-black/50">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                        <CalendarDaysIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {group.displayDate}
                      </span>
                    </div>
                  </div>

                  {/* Media Grid for this date */}
                  <div
                    className={
                      viewMode === "masonry"
                        ? "columns-2 gap-2.5 sm:gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
                        : "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
                    }
                  >
                    {group.items.map(({ id, url, blurDataUrl, type, title, rawName, formattedDate, width, height, createdAt }, itemIndex) => {
                      const isAboveTheFold = groupIndex === 0 && itemIndex < 4;
                      return (
                        <div
                          key={id}
                          className={
                            viewMode === "masonry"
                              ? "group relative mb-2.5 sm:mb-4 break-inside-avoid overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 hover:border-zinc-300 hover:shadow-xl dark:border-white/10 dark:bg-zinc-900/80 dark:shadow-lg dark:hover:border-white/20 dark:hover:shadow-2xl dark:hover:shadow-black/60"
                              : "group relative overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-xl border border-zinc-200/80 dark:border-white/10 dark:bg-zinc-900/80 dark:hover:border-white/25 flex flex-col"
                          }
                        >
                          {/* Action buttons (Only for Admin) */}
                          {user && (
                            <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-30 flex items-center gap-1 sm:gap-1.5 opacity-0 transition group-hover:opacity-100">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingItem({ id, url, blurDataUrl, type, title, rawName, width, height, createdAt, formattedDate });
                                }}
                                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur-md transition hover:bg-blue-600 hover:text-white"
                                title="Edit title & date"
                              >
                                <PencilSquareIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeletingItem({ id, url, blurDataUrl, type, title, rawName, width, height });
                                }}
                                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur-md transition hover:bg-red-600 hover:text-white"
                                title="Delete"
                              >
                                <TrashIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Video indicator tag in top-left */}
                          {type === "video" && (
                            <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-20 flex items-center gap-1 rounded bg-black/60 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-white backdrop-blur-md">
                              <FilmIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-400" />
                              <span>Video</span>
                            </div>
                          )}

                          {/* Media container */}
                          <Link
                            href={`/?photoId=${id}`}
                            as={`/p/${id}`}
                            ref={id === Number(lastViewedPhoto) ? lastViewedPhotoRef : null}
                            shallow
                            className="relative block w-full cursor-zoom-in overflow-hidden"
                          >
                            {type === "video" ? (
                              <div className="relative w-full">
                                <video
                                  src={`${url}#t=0.001`}
                                  preload="none"
                                  muted
                                  playsInline
                                  style={
                                    viewMode === "masonry"
                                      ? {
                                        aspectRatio:
                                          width && height ? `${width} / ${height}` : "16 / 9",
                                      }
                                      : undefined
                                  }
                                  className={`w-full block transform brightness-90 transition duration-300 will-change-transform group-hover:scale-[1.03] group-hover:brightness-105 ${viewMode === "large"
                                    ? "aspect-[16/10] sm:aspect-[16/9] object-cover"
                                    : "h-auto"
                                    }`}
                                />
                                {/* Video Play Badge overlay */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition duration-300 group-hover:scale-110 group-hover:bg-blue-600 shadow-lg">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                      className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <Image
                                alt={title || "Family photo"}
                                className={`w-full block transform brightness-95 transition duration-300 will-change-transform group-hover:scale-[1.03] group-hover:brightness-105 ${viewMode === "large"
                                  ? "aspect-[16/10] sm:aspect-[16/9] object-cover"
                                  : "h-auto"
                                  }`}
                                placeholder="blur"
                                blurDataURL={blurDataUrl}
                                src={url}
                                width={width || 720}
                                height={height || 480}
                                priority={isAboveTheFold}
                                loading={isAboveTheFold ? "eager" : "lazy"}
                                style={
                                  viewMode === "masonry"
                                    ? {
                                      aspectRatio:
                                        width && height ? `${width} / ${height}` : "auto",
                                    }
                                    : undefined
                                }
                                sizes={
                                  viewMode === "large"
                                    ? "(max-width: 768px) 100vw, 50vw"
                                    : "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                                }
                              />
                            )}

                            {/* Title Overlay for masonry */}
                            {viewMode !== "large" && (Boolean(title && title.trim()) || formattedDate) && (
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2.5 sm:px-3 pt-8 pb-2 sm:pt-10 sm:pb-2.5 flex flex-col justify-end">
                                {title && title.trim() ? (
                                  <span className="text-[10px] sm:text-[12px] text-white/80 font-medium block truncate mt-0.5">
                                    {title}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </Link>

                          {/* Large mode footer info bar */}
                          {viewMode === "large" && (
                            <div className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900/90 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                                  {title && title.trim() ? title : "Khoảnh khắc gia đình"}
                                </h4>
                              </div>
                              <Link
                                href={`/?photoId=${id}`}
                                as={`/p/${id}`}
                                className="shrink-0 rounded-lg bg-zinc-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-white/5 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition"
                              >
                                Xem &rarr;
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="my-16 flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/80 p-12 text-center text-zinc-900 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-white/70">
              <CalendarDaysIcon className="h-7 w-7 text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold">No memories yet</h2>
            <p className="mt-1.5 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
              {user
                ? "The timeline is currently empty. Upload photos or videos to get started."
                : "No shared memories on the timeline yet."}
            </p>
            {user && (
              <button
                onClick={() => setIsUploadOpen(true)}
                className="mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                <span>Upload now</span>
              </button>
            )}
          </div>
        )}

        {/* Floating Actions (Back to Top & Admin Upload) */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
          {showBackToTop && (
            <button
              onClick={scrollToTop}
              className="group pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200/90 bg-white/95 text-zinc-600 shadow-xl shadow-zinc-900/10 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-blue-400/50 hover:bg-white hover:text-blue-600 hover:shadow-2xl hover:shadow-blue-500/15 active:scale-90 dark:border-white/10 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:border-blue-400/40 dark:hover:bg-zinc-800 dark:hover:text-blue-400 dark:shadow-black/50 animate-fade-in"
              title="Về đầu trang"
              aria-label="Back to top"
            >
              <ArrowUpIcon className="h-5 w-5 stroke-[2.25] transition-transform duration-300 group-hover:-translate-y-1" />
            </button>
          )}

          {user && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/20 bg-blue-600/90 px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-blue-600/30 backdrop-blur-md transition hover:scale-105 hover:bg-blue-500 focus:outline-none"
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              <span>Upload</span>
            </button>
          )}
        </div>

        {/* Modals */}
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={() => {
            showToast("Upload completed successfully!");
            refreshMedia(true);
            router.replace(router.asPath, undefined, { scroll: false });
          }}
        />

        <DeleteConfirmModal
          isOpen={deletingItem !== null}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleDeleteConfirm}
          filename={deletingItem?.title || ""}
          isDeleting={isDeleting}
        />

        <EditMediaModal
          isOpen={editingItem !== null}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaveSuccess={(updated) => {
            setMediaList((prev) =>
              prev.map((m) =>
                m.rawName === updated.rawName ? { ...m, ...updated } : m
              )
            );
            showToast("Updated successfully!");
            refreshMedia(true);
          }}
        />

        <AdminLoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={(email) => {
            showToast(`Signed in as ${email}`);
          }}
        />

        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform rounded-xl border border-zinc-200 bg-white/95 px-5 py-3 text-sm font-medium text-zinc-900 shadow-2xl backdrop-blur-xl animate-fade-in dark:border-white/15 dark:bg-zinc-900/95 dark:text-white">
            {toastMessage}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-zinc-200/80 bg-white/40 dark:border-white/10 dark:bg-black/30 backdrop-blur-md py-8 px-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <div className="mx-auto flex max-w-7xl items-center justify-center">
          <p>Đức Trang Linh &bull; Cherishing every moment</p>
        </div>
      </footer>
    </>
  );
};

export default Home;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Allow immediate refresh on reload while keeping short micro-cache for spikes
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=1, stale-while-revalidate=9"
  );

  const images = await getResults(false);
  return {
    props: {
      images,
    },
  };
};
