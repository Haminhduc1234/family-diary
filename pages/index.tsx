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
  LockClosedIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Modal from "../components/Modal";
import UploadModal from "../components/UploadModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import AdminLoginModal from "../components/AdminLoginModal";
import EditMediaModal from "../components/EditMediaModal";
import getResults from "../utils/cachedImages";
import type { ImageProps } from "../utils/types";
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto";
import { supabase } from "../utils/supabase";

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
    refreshMedia();
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
            displayDate = d.toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            });
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

  const refreshMedia = async () => {
    try {
      const res = await fetch("/api/media");
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
      await refreshMedia();
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
    await refreshMedia();
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

      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {photoId && (
          <Modal
            images={mediaList}
            onClose={() => {
              setLastViewedPhoto(photoId);
            }}
            onDeletePhoto={user ? handleDeleteFromModal : undefined}
            onEditPhoto={user ? (item) => setEditingItem(item) : undefined}
          />
        )}

        {/* Simple & Minimalist Header */}
        <header className="mb-8 sm:mb-12 border-b border-white/10 pb-6 sm:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Family Diary
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                A visual timeline of memories
              </p>
            </div>

            {user ? (
              <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <ArrowRightOnRectangleIcon className="h-3.5 w-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/30 hover:bg-white/10 hover:text-white self-start sm:self-auto"
              >
                <LockClosedIcon className="h-3.5 w-3.5" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </header>

        {/* Timeline Container */}
        {timelineGroups.length > 0 ? (
          <div className="relative border-l border-white/15 ml-3 sm:ml-6 pl-6 sm:pl-8 space-y-12">
            {timelineGroups.map((group) => (
              <section key={group.dateKey} className="relative">
                {/* Timeline node icon */}
                <div className="absolute -left-[45px] sm:-left-[45px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-blue-400/40 bg-zinc-900 shadow-md shadow-blue-500/20">
                  <div className="h-2 w-2 rounded-full bg-blue-400" />
                </div>

                {/* Date milestone label */}
                <div className="mb-5 flex flex-wrap items-center gap-2.5">
                  <span className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
                    <CalendarDaysIcon className="h-3.5 w-3.5 text-blue-400" />
                    <span>{group.displayDate}</span>
                  </span>
                  <span className="text-xs text-zinc-400">
                    ({group.items.length} {group.items.length === 1 ? "moment" : "moments"})
                  </span>
                </div>

                {/* Media Grid for this date (Masonry Columns to keep original aspect ratio) */}
                <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
                  {group.items.map(({ id, url, blurDataUrl, type, title, rawName, formattedDate, width, height, createdAt }) => (
                    <div
                      key={id}
                      className="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border border-white/10 bg-zinc-900/80 shadow-lg transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/60"
                    >
                      {/* Action buttons (Only for Admin) */}
                      {user && (
                        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingItem({ id, url, blurDataUrl, type, title, rawName, width, height, createdAt, formattedDate });
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur-md transition hover:bg-blue-600 hover:text-white"
                            title="Edit title & date"
                          >
                            <PencilSquareIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeletingItem({ id, url, blurDataUrl, type, title, rawName, width, height });
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur-md transition hover:bg-red-600 hover:text-white"
                            title="Delete"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Video indicator tag in top-left */}
                      {type === "video" && (
                        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
                          <FilmIcon className="h-3 w-3 text-blue-400" />
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
                              preload="metadata"
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
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition duration-300 group-hover:scale-110 group-hover:bg-blue-600 shadow-lg">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="h-5 w-5 ml-0.5"
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
                            style={{
                              aspectRatio:
                                width && height ? `${width} / ${height}` : "auto",
                            }}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          />
                        )}

                        {/* Title Overlay: Hiển thị ngay trên ảnh góc nhỏ phía dưới bên trái với hiệu ứng nền mờ dần */}
                        {(Boolean(title && title.trim()) || formattedDate) && (
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pt-10 pb-2.5 flex flex-col justify-end">
                            {title && title.trim() ? (
                              <span className="text-[12px] text-white/60 font-medium block mt-0.5">
                                {title}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="my-16 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white backdrop-blur-md">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white/70">
              <CalendarDaysIcon className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold">No memories yet</h2>
            <p className="mt-1.5 max-w-md text-sm text-zinc-400">
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
            refreshMedia();
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
            refreshMedia();
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
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform rounded-xl border border-white/15 bg-zinc-900/95 px-5 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-xl animate-fade-in">
            {toastMessage}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/10 bg-black/40 py-8 px-4 text-center text-xs text-zinc-400">
        <div className="mx-auto flex max-w-7xl items-center justify-center">
          <p>Family Diary &bull; Cherishing every moment</p>
        </div>
      </footer>
    </>
  );
};

export default Home;

export const getServerSideProps: GetServerSideProps = async () => {
  const images = await getResults(true);
  return {
    props: {
      images,
    },
  };
};
