import sharp from "sharp";
import { getSupabaseServerClient } from "./supabase";
import { DEFAULT_BUCKET, fetchStorageFiles, getMediaPublicUrl } from "./supabaseStorage";
import type { ImageProps, MediaType } from "./types";

let cached: ImageProps[] | null = null;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "ogg"]);

const VIDEO_BLUR_DATA_URL =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10">
      <rect width="10" height="10" fill="#18181b"/>
      <polygon points="4,3 7,5 4,7" fill="#52525b"/>
    </svg>`
  ).toString("base64");

const DEFAULT_IMAGE_BLUR_DATA_URL =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10">
      <rect width="10" height="10" fill="#27272a"/>
    </svg>`
  ).toString("base64");

function getMediaType(filename: string): MediaType | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  return null;
}

function parseFileTitle(fileName: string): string {
  const parts = fileName.split("---");
  if (parts.length >= 2) {
    try {
      return decodeURIComponent(parts[1]).replace(/_/g, " ").trim();
    } catch {
      return parts[1].replace(/_/g, " ").trim();
    }
  }
  const withoutExt = fileName.replace(/\.[^/.]+$/, "");
  const withoutTimestamp = withoutExt.replace(/^\d+[_]/, "");
  return withoutTimestamp.replace(/[-_]/g, " ").trim() || withoutExt;
}

function formatMediaDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

async function describeImage(
  filename: string,
  url: string,
  bucket: string
): Promise<{
  width: number;
  height: number;
  blurDataUrl: string;
}> {
  try {
    let buf: Buffer | null = null;
    const client = getSupabaseServerClient();

    // Try downloading buffer directly via Supabase client
    if (client) {
      try {
        const { data, error } = await client.storage.from(bucket).download(filename);
        if (!error && data) {
          buf = Buffer.from(await data.arrayBuffer());
        }
      } catch {
        // Fall back to HTTP fetch
      }
    }

    if (!buf && url) {
      const res = await fetch(url);
      if (res.ok) {
        buf = Buffer.from(await res.arrayBuffer());
      }
    }

    if (!buf) {
      throw new Error(`Unable to fetch image buffer for ${filename}`);
    }

    const meta = await sharp(buf).metadata();
    const placeholder = await sharp(buf)
      .resize(10)
      .jpeg({ quality: 70 })
      .toBuffer();

    return {
      width: meta.width ?? 720,
      height: meta.height ?? 480,
      blurDataUrl: `data:image/jpeg;base64,${placeholder.toString("base64")}`,
    };
  } catch (err) {
    console.warn(`[cachedImages] Failed to inspect image "${filename}":`, err);
    return {
      width: 720,
      height: 480,
      blurDataUrl: DEFAULT_IMAGE_BLUR_DATA_URL,
    };
  }
}

export default async function getResults(forceRefresh: boolean = false): Promise<ImageProps[]> {
  if (forceRefresh) {
    cached = null;
  } else if (cached) {
    return cached;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.warn(
      "[cachedImages] Supabase credentials are not configured in .env.local. Returning empty gallery."
    );
    return [];
  }

  const bucket = DEFAULT_BUCKET;

  try {
    const files = await fetchStorageFiles("", bucket);

    // Filter valid image and video files
    const mediaFiles = files.filter((file) => {
      if (!file.name || file.name === ".emptyFolderPlaceholder") return false;
      return getMediaType(file.name) !== null;
    });

    // Supabase list already supports sorting by created_at desc, but let's ensure order
    const sorted = mediaFiles.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return b.name.localeCompare(a.name);
    });

    cached = await Promise.all(
      sorted.map(async (file, id) => {
        const type = getMediaType(file.name)!;
        const url = getMediaPublicUrl(file.name, bucket);
        const displayTitle = parseFileTitle(file.name);
        const formattedDate = formatMediaDate(file.created_at);
        const dateObj = file.created_at ? new Date(file.created_at) : new Date();

        if (type === "video") {
          return {
            id,
            url,
            width: 1280,
            height: 720,
            blurDataUrl: VIDEO_BLUR_DATA_URL,
            type: "video",
            title: displayTitle,
            rawName: file.name,
            createdAt: file.created_at || dateObj.toISOString(),
            formattedDate,
          };
        }

        const imageMeta = await describeImage(file.name, url, bucket);
        return {
          id,
          url,
          ...imageMeta,
          type: "image",
          title: displayTitle,
          rawName: file.name,
          createdAt: file.created_at || dateObj.toISOString(),
          formattedDate,
        };
      })
    );

    return cached;
  } catch (error) {
    console.error("[cachedImages] Error listing files from Supabase Storage:", error);
    return [];
  }
}
