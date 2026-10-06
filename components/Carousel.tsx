import Image from "next/image";
import { useRouter } from "next/router";
import useKeypress from "react-use-keypress";
import type { ImageProps } from "../utils/types";
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto";
import SharedModal from "./SharedModal";

export default function Carousel({
  index,
  currentPhoto,
  images,
}: {
  index: number;
  currentPhoto: ImageProps;
  images?: ImageProps[];
}) {
  const router = useRouter();
  const [, setLastViewedPhoto] = useLastViewedPhoto();

  function closeModal() {
    setLastViewedPhoto(currentPhoto.id);
    router.push("/", undefined, { shallow: true });
  }

  function changePhotoId(newVal: number) {
    if (images && images[newVal]) {
      router.push(`/p/${images[newVal].id}`, undefined, { shallow: true });
    }
  }

  useKeypress("Escape", () => {
    closeModal();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <button
        className="absolute inset-0 z-30 cursor-default bg-black/90 backdrop-blur-2xl"
        onClick={closeModal}
      >
        {currentPhoto.type === "video" ? (
          <div className="h-full w-full bg-black/80" />
        ) : (
          <Image
            src={currentPhoto.blurDataUrl}
            className="pointer-events-none h-full w-full opacity-60"
            alt="blurred background"
            fill
            priority={true}
          />
        )}
      </button>
      <SharedModal
        index={index}
        changePhotoId={changePhotoId}
        currentPhoto={currentPhoto}
        images={images}
        closeModal={closeModal}
        navigation={Boolean(images && images.length > 1)}
      />
    </div>
  );
}
