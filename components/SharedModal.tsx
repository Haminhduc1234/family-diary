import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  PencilSquareIcon,
  XMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { variants } from "../utils/animationVariants";
import downloadPhoto from "../utils/downloadPhoto";
import { range } from "../utils/range";
import type { ImageProps, SharedModalProps } from "../utils/types";
import Twitter from "./Icons/Twitter";
import DeleteConfirmModal from "./DeleteConfirmModal";

export default function SharedModal({
  index,
  images,
  changePhotoId,
  closeModal,
  navigation,
  currentPhoto,
  direction,
  onDeletePhoto,
  onEditPhoto,
}: SharedModalProps) {
  const [loaded, setLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Zoom & Pan state
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const lastTouchDistanceRef = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const currentImage = images ? images[index] : currentPhoto;

  useEffect(() => {
    setLoaded(false);
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  }, [index]);

  const handleZoomIn = (step = 0.5) => {
    setZoomScale((prev) => {
      const next = Math.min(prev + step, 4);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleZoomOut = (step = 0.5) => {
    setZoomScale((prev) => {
      const next = Math.max(prev - step, 1);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (currentImage.type === "video") return;
    e.preventDefault();
    e.stopPropagation();
    if (zoomScale > 1) {
      handleResetZoom();
    } else {
      setZoomScale(2);
      setPanPosition({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (currentImage.type === "video") return;
    if (e.deltaY < 0) {
      handleZoomIn(0.25);
    } else {
      handleZoomOut(0.25);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1 || currentImage.type === "video") return;
    e.preventDefault();
    setIsPanning(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: panPosition.x,
      posY: panPosition.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || zoomScale <= 1) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setPanPosition({
      x: dragStartRef.current.posX + dx,
      y: dragStartRef.current.posY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (currentImage.type === "video") return;
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        if (zoomScale > 1) {
          handleResetZoom();
        } else {
          setZoomScale(2);
          setPanPosition({ x: 0, y: 0 });
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (zoomScale > 1) {
        setIsPanning(true);
        dragStartRef.current = {
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          posX: panPosition.x,
          posY: panPosition.y,
        };
      }
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      lastTouchDistanceRef.current = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (currentImage.type === "video") return;
    if (e.touches.length === 1 && isPanning && zoomScale > 1) {
      const dx = e.touches[0].clientX - dragStartRef.current.startX;
      const dy = e.touches[0].clientY - dragStartRef.current.startY;
      setPanPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    } else if (e.touches.length === 2 && lastTouchDistanceRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      const ratio = dist / lastTouchDistanceRef.current;
      setZoomScale((prev) => {
        const next = Math.min(Math.max(prev * ratio, 1), 4);
        if (next === 1) setPanPosition({ x: 0, y: 0 });
        return next;
      });
      lastTouchDistanceRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    lastTouchDistanceRef.current = null;
  };

  const filteredImages = images?.filter((img: ImageProps) =>
    range(index - 15, index + 15).includes(img.id)
  );

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (zoomScale <= 1 && images && index < images.length - 1) {
        changePhotoId(index + 1);
      }
    },
    onSwipedRight: () => {
      if (zoomScale <= 1 && index > 0) {
        changePhotoId(index - 1);
      }
    },
    trackMouse: zoomScale <= 1,
  });

  if (!currentImage) return null;

  return (
    <MotionConfig
      transition={{
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      }}
    >
      <div
        className="relative z-50 flex h-full w-full max-w-7xl items-center justify-center wide:h-full xl:taller-than-854:h-auto"
        {...handlers}
      >
        {/* Main image / video container */}
        <div className="w-full h-full overflow-hidden flex items-center justify-center">
          <div
            className="relative flex h-full w-full items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={index}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute flex items-center justify-center w-full h-full p-2 sm:p-4"
                onClick={(e) => {
                  if (e.target === e.currentTarget) closeModal();
                }}
              >
                {currentImage.type === "video" ? (
                  <div className="relative flex max-w-full items-center justify-center">
                    <video
                      key={currentImage.url}
                      src={currentImage.url}
                      controls
                      autoPlay
                      playsInline
                      style={{
                        aspectRatio:
                          currentImage.width && currentImage.height
                            ? `${currentImage.width} / ${currentImage.height}`
                            : undefined,
                      }}
                      className={`${navigation
                        ? "max-h-[calc(100dvh-150px)] sm:max-h-[80vh]"
                        : "max-h-[calc(100dvh-90px)] sm:max-h-[85vh]"
                        } max-w-full rounded-lg shadow-2xl object-contain`}
                      onLoadedData={() => setLoaded(true)}
                      onCanPlay={() => setLoaded(true)}
                    />
                  </div>
                ) : (
                  <div
                    ref={imageContainerRef}
                    className="relative flex items-center justify-center select-none"
                    onDoubleClick={handleDoubleClick}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onWheel={handleWheel}
                    style={{
                      transform: `translate3d(${panPosition.x}px, ${panPosition.y}px, 0px) scale(${zoomScale})`,
                      transition: isPanning ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      cursor: zoomScale > 1 ? (isPanning ? "grabbing" : "grab") : "zoom-in",
                      touchAction: zoomScale > 1 ? "none" : "auto",
                    }}
                  >
                    <Image
                      src={currentImage.url}
                      width={currentImage.width || (navigation ? 1280 : 1920)}
                      height={currentImage.height || (navigation ? 853 : 1280)}
                      priority
                      alt={currentImage.title || "Family Diary media"}
                      draggable={false}
                      style={{
                        aspectRatio:
                          currentImage.width && currentImage.height
                            ? `${currentImage.width} / ${currentImage.height}`
                            : undefined,
                      }}
                      className={`${navigation
                        ? "max-h-[calc(100dvh-150px)] sm:max-h-[80vh]"
                        : "max-h-[calc(100dvh-90px)] sm:max-h-[85vh]"
                        } w-auto max-w-full object-contain pointer-events-none`}
                      onLoad={() => setLoaded(true)}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Buttons + bottom nav bar */}
        <div className="absolute inset-0 mx-auto flex max-w-7xl items-center justify-center pointer-events-none">
          {/* Buttons overlay */}
          {loaded && (
            <div className="relative h-full w-full pointer-events-none">
              {navigation && images && (
                <>
                  {index > 0 && (
                    <button
                      className="pointer-events-auto absolute left-3 top-[calc(50%-16px)] rounded-full bg-black/50 p-2 sm:p-3 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white focus:outline-none"
                      style={{ transform: "translate3d(0, 0, 0)" }}
                      onClick={() => changePhotoId(index - 1)}
                    >
                      <ChevronLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  )}
                  {index + 1 < images.length && (
                    <button
                      className="pointer-events-auto absolute right-3 top-[calc(50%-16px)] rounded-full bg-black/50 p-2 sm:p-3 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white focus:outline-none"
                      style={{ transform: "translate3d(0, 0, 0)" }}
                      onClick={() => changePhotoId(index + 1)}
                    >
                      <ChevronRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  )}
                </>
              )}
              <div className="pointer-events-auto absolute top-0 right-0 flex items-center gap-2 p-3 sm:p-4 text-white">
                {currentImage.type !== "video" && (
                  <div className="flex items-center gap-0.5 rounded-full bg-black/50 p-1 backdrop-blur-lg">
                    <button
                      onClick={() => handleZoomOut(0.5)}
                      disabled={zoomScale <= 1}
                      className="rounded-full p-1.5 text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Zoom out (-)"
                    >
                      <MagnifyingGlassMinusIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleZoomIn(0.5)}
                      disabled={zoomScale >= 4}
                      className="rounded-full p-1.5 text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Zoom in (+)"
                    >
                      <MagnifyingGlassPlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
                <a
                  href={currentImage.url}
                  className="rounded-full bg-black/50 p-2 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white"
                  target="_blank"
                  title={currentImage.type === "video" ? "Open fullsize video" : "Open fullsize photo"}
                  rel="noreferrer"
                >
                  <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                </a>
                <button
                  onClick={() => {
                    const ext =
                      currentImage.url.split("?")[0].split(".").pop() ||
                      (currentImage.type === "video" ? "mp4" : "jpg");
                    const filename = currentImage.title || `${index}.${ext}`;
                    downloadPhoto(currentImage.url, filename);
                  }}
                  className="rounded-full bg-black/50 p-2 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white"
                  title="Download media"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
                {onEditPhoto && (
                  <button
                    onClick={() => onEditPhoto(currentImage)}
                    className="rounded-full bg-black/50 p-2 text-white/75 backdrop-blur-lg transition hover:bg-blue-600/80 hover:text-white"
                    title="Edit title & date"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                )}
                {onDeletePhoto && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-full bg-black/50 p-2 text-white/75 backdrop-blur-lg transition hover:bg-red-600/80 hover:text-white"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              <div className="pointer-events-auto absolute top-0 left-0 flex items-center gap-2.5 p-3 sm:p-4 text-white">
                <button
                  onClick={() => closeModal()}
                  className="rounded-full bg-black/50 p-2 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white"
                >
                  {navigation ? (
                    <XMarkIcon className="h-5 w-5" />
                  ) : (
                    <ArrowUturnLeftIcon className="h-5 w-5" />
                  )}
                </button>
                {currentImage.title && (
                  <span className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-lg max-w-[200px] xs:max-w-[250px] sm:max-w-md">
                    {currentImage.title}
                  </span>
                )}
              </div>

              {/* Zoom % indicator centered below image when zoomed */}
              {currentImage.type !== "video" && zoomScale > 1 && (
                <div
                  className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-full border border-white/20 bg-black/80 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xl backdrop-blur-xl animate-fade-in ${navigation ? "bottom-24 sm:bottom-28" : "bottom-6 sm:bottom-8"
                    }`}
                >
                  <span className="font-semibold text-white/95">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <span className="h-3 w-px bg-white/25" />
                  <button
                    onClick={handleResetZoom}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition"
                    title="Reset zoom về 100%"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bottom Nav bar */}
          {navigation && images && filteredImages && (
            <div className="fixed inset-x-0 bottom-0 z-40 overflow-hidden bg-gradient-to-b from-black/0 to-black/60 pointer-events-auto">
              <motion.div
                initial={false}
                className="mx-auto mt-4 mb-4 sm:mt-6 sm:mb-6 flex aspect-[3/2] h-12 sm:h-14"
              >
                <AnimatePresence initial={false}>
                  {filteredImages.map(({ url, id, type, title }) => (
                    <motion.button
                      initial={{
                        width: "0%",
                        x: `${Math.max((index - 1) * -100, 15 * -100)}%`,
                      }}
                      animate={{
                        scale: id === index ? 1.25 : 1,
                        width: "100%",
                        x: `${Math.max(index * -100, 15 * -100)}%`,
                      }}
                      exit={{ width: "0%" }}
                      onClick={() => changePhotoId(id)}
                      key={id}
                      className={`${id === index
                        ? "z-20 rounded-md shadow shadow-black/50 ring-2 ring-white/50"
                        : "z-10"
                        } ${id === 0 ? "rounded-l-md" : ""} ${id === images.length - 1 ? "rounded-r-md" : ""
                        } relative inline-block w-full shrink-0 transform-gpu overflow-hidden focus:outline-none`}
                    >
                      {type === "video" ? (
                        <div className="relative h-full w-full bg-zinc-900 flex items-center justify-center">
                          <video
                            src={`${url}#t=0.001`}
                            preload="metadata"
                            muted
                            playsInline
                            className={`${id === index
                              ? "brightness-110"
                              : "brightness-50 contrast-125 hover:brightness-75"
                              } h-full w-full transform object-cover transition`}
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="rounded-full bg-black/60 p-1">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-3 h-3 text-white"
                              >
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Image
                          alt={title || "small photos on the bottom"}
                          width={180}
                          height={120}
                          className={`${id === index
                            ? "brightness-110 hover:brightness-110"
                            : "brightness-50 contrast-125 hover:brightness-75"
                            } h-full transform object-cover transition`}
                          src={url}
                        />
                      )}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </div>
      </div>
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          if (!onDeletePhoto || !currentImage) return;
          setIsDeleting(true);
          try {
            await onDeletePhoto(currentImage.id, currentImage.title || "");
            setShowDeleteConfirm(false);
          } catch (err) {
            console.error("Delete failed:", err);
          } finally {
            setIsDeleting(false);
          }
        }}
        filename={currentImage.title || `Media #${index}`}
        isDeleting={isDeleting}
      />
    </MotionConfig>
  );
}
