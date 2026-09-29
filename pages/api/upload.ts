import type { NextApiRequest, NextApiResponse } from "next";
import { DEFAULT_BUCKET, uploadMediaFile } from "../../utils/supabaseStorage";

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
    const { filename, fileBase64, contentType, bucket } = req.body;

    if (!filename || !fileBase64) {
      return res
        .status(400)
        .json({ error: "filename and fileBase64 are required." });
    }

    const buffer = Buffer.from(fileBase64, "base64");
    const result = await uploadMediaFile(filename, buffer, {
      contentType: contentType || "application/octet-stream",
      bucket: bucket || DEFAULT_BUCKET,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message || "Upload failed." });
  }
}
