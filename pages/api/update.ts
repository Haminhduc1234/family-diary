import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServerClient } from "../../utils/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST" && req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed. Use POST or PUT." });
  }

  try {
    const { storage_path, title, created_at } = req.body;

    if (!storage_path) {
      return res.status(400).json({ error: "storage_path is required." });
    }

    const serverClient = getSupabaseServerClient();
    if (!serverClient) {
      return res.status(500).json({ error: "Supabase client is not configured." });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof title === "string") {
      updates.title = title.trim();
    }

    if (created_at) {
      updates.created_at = created_at;
    }

    const { data, error } = await serverClient
      .from("media")
      .update(updates)
      .eq("storage_path", storage_path)
      .select();

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error("Update error:", error);
    return res.status(500).json({ error: error.message || "Update failed." });
  }
}
