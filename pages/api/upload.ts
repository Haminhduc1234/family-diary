import type { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";
import { DEFAULT_BUCKET, uploadMediaFile } from "../../utils/supabaseStorage";
import { getSupabaseServerClient } from "../../utils/supabase";
import { clearMediaCache } from "../../utils/cachedImages";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { filename, fileBase64, contentType, bucket, title, type, width, height, createdAt, created_at } = req.body;

    if (!filename || !fileBase64) {
      return res
        .status(400)
        .json({ error: "filename and fileBase64 are required." });
    }

    const isVideo =
      type === "video" ||
      /\.(mp4|webm|mov|m4v|ogg)$/i.test(filename) ||
      (contentType && contentType.startsWith("video/"));

    if (isVideo) {
      return res.status(400).json({ error: "Only photo uploads are supported." });
    }

    const buffer = Buffer.from(fileBase64, "base64");
    const result = await uploadMediaFile(filename, buffer, {
      contentType: contentType || "image/jpeg",
      bucket: bucket || DEFAULT_BUCKET,
    });

    // Also insert record into Supabase 'media' database table
    const serverClient = getSupabaseServerClient();
    if (serverClient) {
      try {
        let finalWidth = Number(width);
        let finalHeight = Number(height);

        if (!finalWidth || !finalHeight) {
          try {
            const meta = await sharp(buffer).metadata();
            const isRotated = meta.orientation && [5, 6, 7, 8].includes(meta.orientation);
            finalWidth = isRotated ? (meta.height || 1200) : (meta.width || 1200);
            finalHeight = isRotated ? (meta.width || 800) : (meta.height || 800);
          } catch {
            finalWidth = 1200;
            finalHeight = 800;
          }
        }

        let blurDataUrl: string | null = req.body.blurDataUrl || null;
        if (!isVideo && !blurDataUrl) {
          try {
            const placeholder = await sharp(buffer)
              .rotate()
              .resize(10)
              .jpeg({ quality: 70 })
              .toBuffer();
            blurDataUrl = `data:image/jpeg;base64,${placeholder.toString("base64")}`;
          } catch {
            // fallback
          }
        }

        const itemCreatedAt = createdAt || created_at || new Date().toISOString();

        const { error: dbError } = await serverClient.from("media").insert({
          title: title || "",
          storage_path: filename,
          url: result.publicUrl,
          type: isVideo ? "video" : "image",
          width: finalWidth,
          height: finalHeight,
          blur_data_url: blurDataUrl,
          created_at: itemCreatedAt,
        });
        if (dbError) {
          console.warn("[api/upload] media table insert notice:", dbError.message);
        }
      } catch (dbEx) {
        console.warn("[api/upload] media table insert error:", dbEx);
      }
    }

    clearMediaCache();
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message || "Upload failed." });
  }
}
