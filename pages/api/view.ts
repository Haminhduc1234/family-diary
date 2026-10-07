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
    // 1. Try RPC first (Bypasses RLS with SECURITY DEFINER and executes atomically)
    const { data: rpcData, error: rpcError } = await serverClient.rpc("increment_media_view", {
      target_path: storage_path,
    });

    if (!rpcError && typeof rpcData === "number") {
      return res.status(200).json({ success: true, views: rpcData, method: "rpc" });
    }

    // 2. Fallback: Select then Update
    const { data: row, error: selectError } = await serverClient
      .from("media")
      .select("id, views")
      .eq("storage_path", storage_path)
      .maybeSingle();

    if (selectError) {
      console.error("[api/view] selectError:", selectError.message);
      return res.status(400).json({
        success: false,
        error: selectError.message,
        hint: "Chưa có cột 'views' trong bảng media trên Supabase. Vui lòng chạy lệnh SQL trong SQL Editor.",
      });
    }

    if (row) {
      const currentViews = typeof row.views === "number" ? row.views : 0;
      const { data: updatedRows, error: updateError } = await serverClient
        .from("media")
        .update({ views: currentViews + 1 })
        .eq("id", row.id)
        .select();

      if (updateError || !updatedRows || updatedRows.length === 0) {
        console.error(
          "[api/view] updateError:",
          updateError?.message || "0 rows updated. Check RLS policies or SUPABASE_SERVICE_ROLE_KEY."
        );
        return res.status(400).json({
          success: false,
          error:
            updateError?.message ||
            "Không thể cập nhật lượt xem (RLS chặn hoặc thiếu quyền update). Hãy dùng hàm RPC increment_media_view.",
        });
      }

      return res.status(200).json({
        success: true,
        views: currentViews + 1,
      });
    }

    return res.status(404).json({ error: "Media not found in database" });
  } catch (error: any) {
    console.error("[api/view] View increment error:", error);
    return res.status(500).json({ error: error.message || "Failed to record view" });
  }
}
