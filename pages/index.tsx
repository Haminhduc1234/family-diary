import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  FilmIcon,
  GlobeAltIcon,
  LockClosedIcon,
  PencilSquareIcon,
  TrashIcon,
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

  const lastViewedPhotoRef = useRef<HTMLAnchorElement>(null);

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

      <main className="mx-auto min-h-screen max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
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

        {/* Enhanced Modern Header */}
        <header className="relative mb-6 sm:mb-10 pb-6 sm:pb-8">
          {/* Subtle Ambient Glows */}
          <div className="pointer-events-none absolute -top-10 left-8 -z-10 h-32 w-64 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/15" />
          <div className="pointer-events-none absolute -top-10 right-8 -z-10 h-32 w-64 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/15" />

          <div className="flex items-center justify-between gap-3 sm:gap-4">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-2.5 sm:gap-4 shrink-0 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight whitespace-nowrap bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
                    My family memories
                  </h1>
                  {mediaList.length > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span>{mediaList.length} moments</span>
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-normal whitespace-nowrap truncate max-w-[240px] sm:max-w-none">
                  A visual timeline of precious memories
                </p>
              </div>
            </div>

            {/* Right Action Controls Island */}
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-zinc-200/80 bg-white/70 p-1 sm:p-1.5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-none shrink-0">
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
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-white/10 to-transparent" />
          <div className="absolute -bottom-px left-1/4 h-[2px] w-28 sm:w-40 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent blur-[0.5px]" />
        </header>

        {/* Timeline Container */}
        {timelineGroups.length > 0 ? (
          <div className="relative border-l border-zinc-200/80 ml-2.5 sm:ml-6 pl-4 sm:pl-8 space-y-10 sm:space-y-12 dark:border-white/15">
            {timelineGroups.map((group, groupIndex) => (
              <section key={group.dateKey} className="relative">
                {/* Timeline node icon */}
                <div className="absolute -left-[29px] sm:-left-[45px] top-[2px] flex h-6 w-6 items-center justify-center rounded-full border border-blue-400/40 bg-white shadow-md shadow-blue-500/10 dark:bg-zinc-900 dark:shadow-blue-500/20">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>

                {/* Date milestone label */}
                <div className="mb-4 sm:mb-5 flex flex-wrap items-center gap-2.5">
                  <span className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-800 shadow-sm backdrop-blur-md dark:border-transparent dark:bg-white/10 dark:text-white dark:shadow-none">
                    <CalendarDaysIcon className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                    <span>{group.displayDate}</span>
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    ({group.items.length} {group.items.length === 1 ? "moment" : "moments"})
                  </span>
                </div>

                {/* Media Grid for this date (2 columns on mobile, maintaining original aspect ratio) */}
                <div className="columns-2 gap-2.5 sm:gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
                  {group.items.map(({ id, url, blurDataUrl, type, title, rawName, formattedDate, width, height, createdAt }, itemIndex) => {
                    const isAboveTheFold = groupIndex === 0 && itemIndex < 4;
                    return (
                      <div
                        key={id}
                        className="group relative mb-2.5 sm:mb-4 break-inside-avoid overflow-hidden rounded-md bg-white shadow-sm transition-all duration-300 hover:border-zinc-300 hover:shadow-xl dark:border-white/10 dark:bg-zinc-900/80 dark:shadow-lg dark:hover:border-white/20 dark:hover:shadow-2xl dark:hover:shadow-black/60"
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
                                style={{
                                  aspectRatio:
                                    width && height ? `${width} / ${height}` : "16 / 9",
                                }}
                                className="w-full h-auto block transform brightness-90 transition duration-300 will-change-transform group-hover:scale-[1.02] group-hover:brightness-105"
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
                              className="w-full h-auto block transform brightness-95 transition duration-300 will-change-transform group-hover:scale-[1.02] group-hover:brightness-105"
                              placeholder="blur"
                              blurDataURL={blurDataUrl}
                              src={url}
                              width={width || 720}
                              height={height || 480}
                              priority={isAboveTheFold}
                              loading={isAboveTheFold ? "eager" : "lazy"}
                              style={{
                                aspectRatio:
                                  width && height ? `${width} / ${height}` : "auto",
                              }}
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                            />
                          )}

                          {/* Title Overlay: Hiển thị ngay trên ảnh góc nhỏ phía dưới bên trái với hiệu ứng nền mờ dần */}
                          {(Boolean(title && title.trim()) || formattedDate) && (
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2.5 sm:px-3 pt-8 pb-2 sm:pt-10 sm:pb-2.5 flex flex-col justify-end">
                              {title && title.trim() ? (
                                <span className="text-[10px] sm:text-[12px] text-white/70 font-medium block truncate mt-0.5">
                                  {title}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
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

        {/* Floating Action Button for Admin Upload */}
        {user && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full border border-white/20 bg-blue-600/90 px-5 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur-md transition hover:scale-105 hover:bg-blue-500 focus:outline-none"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            <span>Upload</span>
          </button>
        )}

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
      <footer className="mt-20 border-t border-zinc-200/80 bg-zinc-100/50 py-8 px-4 text-center text-xs text-zinc-500 dark:border-white/10 dark:bg-black/40 dark:text-zinc-400">
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
