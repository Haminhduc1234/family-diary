import type { NextApiRequest, NextApiResponse } from "next";
import { DEFAULT_BUCKET, deleteMediaFiles } from "../../utils/supabaseStorage";
import { getSupabaseServerClient } from "../../utils/supabase";
import { clearMediaCache } from "../../utils/cachedImages";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed. Use POST or DELETE." });
  }

  try {
    const { filenames, filename, bucket } = req.body;
    const targets: string[] = filenames || (filename ? [filename] : []);

    if (!targets || targets.length === 0) {
      return res.status(400).json({ error: "filename or filenames array is required." });
    }

    // Also delete record from Supabase 'media' database table
    const serverClient = getSupabaseServerClient();
    if (serverClient) {
      try {
        await serverClient.from("media").delete().in("storage_path", targets);
      } catch (dbErr) {
        console.warn("[api/delete] media table delete notice:", dbErr);
      }
    }

    const result = await deleteMediaFiles(targets, bucket || DEFAULT_BUCKET);
    clearMediaCache();
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: error.message || "Delete failed." });
  }
}
