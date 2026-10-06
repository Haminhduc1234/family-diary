import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServerClient } from "../../utils/supabase";
import { incrementCachedView } from "../../utils/cachedImages";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { storage_path } = req.body;
  if (!storage_path) {
    return res.status(400).json({ error: "storage_path is required" });
  }

  // Update in-memory cache immediately
  incrementCachedView(storage_path);

  const serverClient = getSupabaseServerClient();
  if (!serverClient) {
    return res.status(200).json({ success: true, cachedOnly: true });
  }

  try {
    // 1. Try RPC first if user created the function
    const { error: rpcError } = await serverClient.rpc("increment_media_view", {
      target_path: storage_path,
    });

    if (!rpcError) {
      return res.status(200).json({ success: true, method: "rpc" });
    }

    // 2. Fallback: Select then Update
    const { data: row, error: selectError } = await serverClient
      .from("media")
      .select("id, views")
      .eq("storage_path", storage_path)
      .maybeSingle();

    if (selectError) {
      // Column 'views' might not exist in Supabase yet
      return res.status(200).json({
        success: true,
        notice: selectError.message,
      });
    }

    if (row) {
      const currentViews = typeof row.views === "number" ? row.views : 0;
      const { error: updateError } = await serverClient
        .from("media")
        .update({ views: currentViews + 1 })
        .eq("id", row.id);

      if (updateError) {
        return res.status(200).json({
          success: true,
          notice: updateError.message,
        });
      }

      return res.status(200).json({
        success: true,
        views: currentViews + 1,
      });
    }

    return res.status(200).json({ success: true, notFoundInDb: true });
  } catch (error: any) {
    console.error("View increment error:", error);
    return res.status(500).json({ error: error.message || "Failed to record view" });
  }
}
