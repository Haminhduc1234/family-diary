import type { NextApiRequest, NextApiResponse } from "next";
import getResults from "../../utils/cachedImages";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  try {
    const force = req.query.refresh === "true";
    const images = await getResults(force);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=120"
    );
    return res.status(200).json({ images });
  } catch (error: any) {
    console.error("Failed to fetch media:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch media" });
  }
}
