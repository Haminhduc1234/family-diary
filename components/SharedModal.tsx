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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentImage = images ? images[index] : currentPhoto;

  // Zoom & Pan state: default 1 (fit screen, 100% natural view)
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const dragStartRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const pinchRef = useRef({
    startDist: 0,
    startScale: 1,
    startPan: { x: 0, y: 0 },
    startCenter: { x: 0, y: 0 },
  });
  const lastTapRef = useRef<number>(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Reset zoom & pan when image changes
  useEffect(() => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
    setIsInteracting(false);
    setIsPanning(false);
  }, [index, currentImage?.type]);

  const handleZoomIn = (step = 0.5) => {
    setIsInteracting(false);
    setZoomScale((prev) => Math.min(prev + step, 4));
  };

  const handleZoomOut = (step = 0.5) => {
    setIsInteracting(false);
    setZoomScale((prev) => {
      const next = Math.max(prev - step, 1);
      if (next <= 1.05) {
        setPanPosition({ x: 0, y: 0 });
        return 1;
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setIsInteracting(false);
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (currentImage?.type === "video") return;
    e.preventDefault();
    e.stopPropagation();
    setIsInteracting(false);
    if (zoomScale > 1.05) {
      setZoomScale(1);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setZoomScale(2);
      setPanPosition({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (currentImage?.type === "video") return;
    setIsInteracting(false);
    if (e.deltaY < 0) {
      handleZoomIn(0.25);
    } else {
      handleZoomOut(0.25);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1.05 || currentImage?.type === "video") return;
    e.preventDefault();
    setIsInteracting(true);
    setIsPanning(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: panPosition.x,
      posY: panPosition.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || zoomScale <= 1.05) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    const maxPanX = (window.innerWidth * (zoomScale - 1)) / 1.6;
    const maxPanY = (window.innerHeight * (zoomScale - 1)) / 1.6;
    const nextX = dragStartRef.current.posX + dx;
    const nextY = dragStartRef.current.posY + dy;
    setPanPosition({
      x: Math.min(Math.max(nextX, -maxPanX), maxPanX),
      y: Math.min(Math.max(nextY, -maxPanY), maxPanY),
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsInteracting(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (currentImage?.type === "video") return;
    if (e.touches.length === 1) {
      const now = Date.now();
      const touch = e.touches[0];
      if (now - lastTapRef.current < 300) {
        // Double tap detected: smooth animated zoom toggle
        lastTapRef.current = 0;
        setIsInteracting(false);
        if (zoomScale > 1.05) {
          setZoomScale(1);
          setPanPosition({ x: 0, y: 0 });
        } else {
          const midX = window.innerWidth / 2;
          const midY = window.innerHeight / 2;
          const targetPanX = (midX - touch.clientX) * 0.7;
          const targetPanY = (midY - touch.clientY) * 0.7;
          setZoomScale(2.2);
          setPanPosition({ x: targetPanX, y: targetPanY });
        }
        return;
      }
      lastTapRef.current = now;

      if (zoomScale > 1.05) {
        setIsInteracting(true);
        setIsPanning(true);
        dragStartRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          posX: panPosition.x,
          posY: panPosition.y,
        };
      }
    } else if (e.touches.length === 2) {
      setIsInteracting(true);
      setIsPanning(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      pinchRef.current = {
        startDist: dist,
        startScale: zoomScale,
        startPan: { ...panPosition },
        startCenter: center,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (currentImage?.type === "video") return;
    if (e.touches.length === 1 && zoomScale > 1.05 && isInteracting) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.startX;
      const dy = touch.clientY - dragStartRef.current.startY;
      const maxPanX = (window.innerWidth * (zoomScale - 1)) / 1.6;
      const maxPanY = (window.innerHeight * (zoomScale - 1)) / 1.6;
      const nextX = dragStartRef.current.posX + dx;
      const nextY = dragStartRef.current.posY + dy;
      setPanPosition({
        x: Math.min(Math.max(nextX, -maxPanX), maxPanX),
        y: Math.min(Math.max(nextY, -maxPanY), maxPanY),
      });
    } else if (e.touches.length === 2 && pinchRef.current.startDist > 0) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      const scaleRatio = dist / pinchRef.current.startDist;
      const nextScale = Math.min(Math.max(pinchRef.current.startScale * scaleRatio, 0.85), 4);
      const dCenterX = center.x - pinchRef.current.startCenter.x;
      const dCenterY = center.y - pinchRef.current.startCenter.y;

      setZoomScale(nextScale);
      setPanPosition({
        x: pinchRef.current.startPan.x + dCenterX,
        y: pinchRef.current.startPan.y + dCenterY,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsInteracting(false);
      setIsPanning(false);
      pinchRef.current.startDist = 0;

      // Snap back if scale was pinched below 1.05
      if (zoomScale <= 1.05) {
        setZoomScale(1);
        setPanPosition({ x: 0, y: 0 });
      } else {
        // Clamp pan if dragged beyond screen
        const maxPanX = (window.innerWidth * (zoomScale - 1)) / 1.8;
        const maxPanY = (window.innerHeight * (zoomScale - 1)) / 1.8;
        setPanPosition((prev) => ({
          x: Math.min(Math.max(prev.x, -maxPanX), maxPanX),
          y: Math.min(Math.max(prev.y, -maxPanY), maxPanY),
        }));
      }
    } else if (e.touches.length === 1) {
      // Smooth handoff from 2 fingers to 1 finger pan
      const touch = e.touches[0];
      dragStartRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        posX: panPosition.x,
        posY: panPosition.y,
      };
      pinchRef.current.startDist = 0;
      if (zoomScale > 1.05) {
        setIsPanning(true);
      }
    }
  };

  const filteredImages = images;

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (zoomScale <= 1.05 && images && index < images.length - 1) {
        changePhotoId(index + 1);
      }
    },
    onSwipedRight: () => {
      if (zoomScale <= 1.05 && index > 0) {
        changePhotoId(index - 1);
      }
    },
    trackTouch: zoomScale <= 1.05,
    trackMouse: zoomScale <= 1.05,
    preventScrollOnSwipe: true,
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
                      transition: isInteracting ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                      cursor: zoomScale > 1.05 ? (isPanning ? "grabbing" : "grab") : "zoom-in",
                      touchAction: zoomScale > 1.05 ? "none" : "pan-y pinch-zoom",
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
                        ? "max-h-[calc(100dvh-160px)] sm:max-h-[80vh]"
                        : "max-h-[calc(100dvh-120px)] sm:max-h-[85vh]"
                        } w-auto max-w-[calc(100vw-16px)] sm:max-w-full object-contain pointer-events-none select-none`}
                      placeholder={currentImage.blurDataUrl ? "blur" : "empty"}
                      blurDataURL={currentImage.blurDataUrl}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Top protective vignette gradient so buttons and titles always pop with high contrast */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 via-black/25 to-transparent z-40" />

        {/* Buttons + bottom nav bar */}
        <div className="absolute inset-0 mx-auto flex max-w-7xl items-center justify-center pointer-events-none z-50">
          {/* Buttons overlay */}
          <div className="relative h-full w-full pointer-events-none z-50">
            {navigation && images && (
              <>
                {index > 0 && (
                  <button
                    className="pointer-events-auto absolute left-2 sm:left-4 top-[calc(50%-20px)] rounded-full bg-black/60 p-2.5 sm:p-3 text-white/80 shadow-lg backdrop-blur-xl transition hover:bg-black/90 hover:text-white hover:scale-105 active:scale-95 focus:outline-none"
                    style={{ transform: "translate3d(0, 0, 0)" }}
                    onClick={() => changePhotoId(index - 1)}
                    aria-label="Previous photo"
                  >
                    <ChevronLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                )}
                {index + 1 < images.length && (
                  <button
                    className="pointer-events-auto absolute right-2 sm:right-4 top-[calc(50%-20px)] rounded-full bg-black/60 p-2.5 sm:p-3 text-white/80 shadow-lg backdrop-blur-xl transition hover:bg-black/90 hover:text-white hover:scale-105 active:scale-95 focus:outline-none"
                    style={{ transform: "translate3d(0, 0, 0)" }}
                    onClick={() => changePhotoId(index + 1)}
                    aria-label="Next photo"
                  >
                    <ChevronRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                )}
              </>
            )}

            {/* Top Right Controls */}
            <div
              className="pointer-events-auto absolute top-0 right-0 flex items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 text-white z-50"
              style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}
            >
              {currentImage.type !== "video" && (
                <div className="flex items-center gap-0.5 rounded-full bg-black/60 p-1 shadow-lg backdrop-blur-xl border border-white/10">
                  <button
                    onClick={() => handleZoomOut(0.5)}
                    disabled={zoomScale <= 1.05}
                    className="rounded-full p-1.5 text-white/75 transition hover:bg-white/15 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent"
                    title="Thu nhỏ (-)"
                    aria-label="Zoom out"
                  >
                    <MagnifyingGlassMinusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <button
                    onClick={() => handleZoomIn(0.5)}
                    disabled={zoomScale >= 4}
                    className="rounded-full p-1.5 text-white/75 transition hover:bg-white/15 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent"
                    title="Phóng to (+)"
                    aria-label="Zoom in"
                  >
                    <MagnifyingGlassPlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              )}
              <a
                href={currentImage.url}
                className="rounded-full bg-black/60 p-2 text-white/80 shadow-lg backdrop-blur-xl border border-white/10 transition hover:bg-black/90 hover:text-white active:scale-95"
                target="_blank"
                title={currentImage.type === "video" ? "Mở video gốc" : "Mở ảnh gốc"}
                rel="noreferrer"
                aria-label="Open original"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
              <button
                onClick={() => {
                  const ext =
                    currentImage.url.split("?")[0].split(".").pop() ||
                    (currentImage.type === "video" ? "mp4" : "jpg");
                  const filename = currentImage.title || `${index}.${ext}`;
                  downloadPhoto(currentImage.url, filename);
                }}
                className="rounded-full bg-black/60 p-2 text-white/80 shadow-lg backdrop-blur-xl border border-white/10 transition hover:bg-black/90 hover:text-white active:scale-95"
                title="Tải về"
                aria-label="Download"
              >
                <ArrowDownTrayIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              {onEditPhoto && (
                <button
                  onClick={() => onEditPhoto(currentImage)}
                  className="rounded-full bg-black/60 p-2 text-white/80 shadow-lg backdrop-blur-xl border border-white/10 transition hover:bg-blue-600 hover:text-white active:scale-95"
                  title="Chỉnh sửa"
                  aria-label="Edit"
                >
                  <PencilSquareIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
              {onDeletePhoto && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-full bg-black/60 p-2 text-white/80 shadow-lg backdrop-blur-xl border border-white/10 transition hover:bg-red-600 hover:text-white active:scale-95"
                  title="Xoá"
                  aria-label="Delete"
                >
                  <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
            </div>

            {/* Top Left Controls */}
            <div
              className="pointer-events-auto absolute top-0 left-0 flex items-center gap-2 p-2.5 sm:p-4 text-white z-50 max-w-[65%]"
              style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}
            >
              <button
                onClick={() => closeModal()}
                className="rounded-full bg-black/60 p-2 text-white/80 shadow-lg backdrop-blur-xl border border-white/10 transition hover:bg-black/90 hover:text-white active:scale-95"
                aria-label="Close"
              >
                {navigation ? (
                  <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <ArrowUturnLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
              {currentImage.title && (
                <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white/95 shadow-lg backdrop-blur-xl border border-white/10 truncate">
                  {currentImage.title}
                </span>
              )}
              {navigation && images && images.length > 1 && (
                <span className="hidden xs:inline-block rounded-full bg-black/60 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 shadow-lg backdrop-blur-xl border border-white/10 shrink-0">
                  {index + 1} / {images.length}
                </span>
              )}
            </div>

            {/* Floating Zoom Indicator & Reset when zoomed */}
            {currentImage.type !== "video" && zoomScale > 1.05 && (
              <div
                className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full border border-white/20 bg-black/85 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xl backdrop-blur-xl animate-fade-in ${
                  navigation ? "bottom-20 sm:bottom-24" : "bottom-6 sm:bottom-8"
                }`}
              >
                <span className="font-semibold text-white/95">
                  {Math.round(zoomScale * 100)}%
                </span>
                <span className="h-3 w-px bg-white/25" />
                <button
                  onClick={handleResetZoom}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition active:scale-95"
                  title="Đặt lại zoom về 100%"
                >
                  Đặt lại
                </button>
              </div>
            )}
          </div>

          {/* Bottom Nav bar */}
          {navigation && images && images.length > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-40 overflow-hidden bg-gradient-to-b from-black/0 to-black/60 pointer-events-auto">
              <motion.div
                initial={false}
                className="mx-auto mt-4 mb-4 sm:mt-6 sm:mb-6 flex aspect-[3/2] h-12 sm:h-14"
              >
                <AnimatePresence initial={false}>
                  {images.map(({ url, id, type, title }, i) => (
                    <motion.button
                      initial={{
                        width: "0%",
                        x: `${(index - 1) * -100}%`,
                      }}
                      animate={{
                        scale: i === index ? 1.25 : 1,
                        width: "100%",
                        x: `${index * -100}%`,
                      }}
                      exit={{ width: "0%" }}
                      onClick={() => changePhotoId(i)}
                      key={id}
                      className={`${i === index
                        ? "z-20 rounded-md shadow shadow-black/50 ring-2 ring-white/50"
                        : "z-10"
                        } ${i === 0 ? "rounded-l-md" : ""} ${i === images.length - 1 ? "rounded-r-md" : ""
                        } relative inline-block w-full shrink-0 transform-gpu overflow-hidden focus:outline-none`}
                    >
                      {type === "video" ? (
                        <div className="relative h-full w-full bg-zinc-900 flex items-center justify-center">
                          <video
                            src={`${url}#t=0.001`}
                            preload="metadata"
                            muted
                            playsInline
                            className={`${i === index
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
                          className={`${i === index
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
