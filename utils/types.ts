/* eslint-disable no-unused-vars */
export type MediaType = "image" | "video";

export interface ImageProps {
  id: number;
  url: string;
  width: number;
  height: number;
  blurDataUrl: string;
  type?: MediaType;
  title?: string;
  rawName?: string;
  createdAt?: string;
  formattedDate?: string;
}

export interface SharedModalProps {
  index: number;
  images?: ImageProps[];
  currentPhoto?: ImageProps;
  changePhotoId: (newVal: number) => void;
  closeModal: () => void;
  navigation: boolean;
  direction?: number;
  onDeletePhoto?: (id: number, filename: string) => Promise<void>;
}
