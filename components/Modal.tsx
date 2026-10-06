import { Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import useKeypress from "react-use-keypress";
import type { ImageProps } from "../utils/types";
import SharedModal from "./SharedModal";

export default function Modal({
  images,
  onClose,
  onDeletePhoto,
  onEditPhoto,
  onViewIncrement,
}: {
  images: ImageProps[];
  onClose?: () => void;
  onDeletePhoto?: (id: number, filename: string) => Promise<void>;
  onEditPhoto?: (item: ImageProps) => void;
  onViewIncrement?: (storagePath: string) => void;
}) {
  let overlayRef = useRef();
  const router = useRouter();

  const { photoId } = router.query;
  const initialIndex = images.findIndex((img) => img.id === Number(photoId));
  const activeIndex = initialIndex >= 0 ? initialIndex : 0;

  const [direction, setDirection] = useState(0);
  const [curIndex, setCurIndex] = useState(activeIndex);

  useEffect(() => {
    if (photoId !== undefined) {
      const idx = images.findIndex((img) => img.id === Number(photoId));
      if (idx >= 0 && idx !== curIndex) {
        setDirection(idx > curIndex ? 1 : -1);
        setCurIndex(idx);
      }
    }
  }, [photoId, images]);

  function handleClose() {
    router.push("/", undefined, { shallow: true });
    if (onClose) onClose();
  }

  function changePhotoId(newIndex: number) {
    if (newIndex < 0 || newIndex >= images.length) return;
    if (newIndex > curIndex) {
      setDirection(1);
    } else {
      setDirection(-1);
    }
    setCurIndex(newIndex);
    const targetPhoto = images[newIndex];
    if (targetPhoto) {
      router.push(
        {
          pathname: "/",
          query: { photoId: targetPhoto.id },
        },
        `/p/${targetPhoto.id}`,
        { shallow: true },
      );
    }
  }

  useKeypress("ArrowRight", () => {
    if (curIndex + 1 < images.length) {
      changePhotoId(curIndex + 1);
    }
  });

  useKeypress("ArrowLeft", () => {
    if (curIndex > 0) {
      changePhotoId(curIndex - 1);
    }
  });

  return (
    <Dialog
      static
      open={true}
      onClose={handleClose}
      initialFocus={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <Dialog.Overlay
        ref={overlayRef}
        as={motion.div}
        key="backdrop"
        className="fixed inset-0 z-30 bg-black/70 backdrop-blur-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <SharedModal
        index={curIndex}
        direction={direction}
        images={images}
        changePhotoId={changePhotoId}
        closeModal={handleClose}
        navigation={true}
        onDeletePhoto={onDeletePhoto}
        onEditPhoto={onEditPhoto}
        onViewIncrement={onViewIncrement}
      />
    </Dialog>
  );
}
