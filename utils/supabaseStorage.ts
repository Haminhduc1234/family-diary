import { getSupabaseServerClient, supabase } from "./supabase";

export const DEFAULT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "family-media";

/**
 * Get the appropriate Supabase client (server or browser)
 */
function getClient() {
  if (typeof window === "undefined") {
    return getSupabaseServerClient() || supabase;
  }
  return supabase;
}

/**
 * Retrieve public URL for a file in Supabase storage
 */
export function getMediaPublicUrl(
  path: string,
  bucket: string = DEFAULT_BUCKET
): string {
  const client = getClient();
  if (!client) return "";

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Fetch list of files from Supabase Storage bucket
 */
export async function fetchStorageFiles(
  folder: string = "",
  bucket: string = DEFAULT_BUCKET
) {
  const client = getClient();
  if (!client) {
    console.warn("[supabaseStorage] Supabase client is not configured.");
    return [];
  }

  let allFiles: Array<{
    name: string;
    id: string;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: Record<string, any>;
  }> = [];

  const limit = 100;
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage.from(bucket).list(folder, {
      limit,
      offset,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      console.error("[supabaseStorage] Error listing files from bucket:", error.message);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    allFiles.push(...data);

    if (data.length < limit) {
      break;
    }
    offset += limit;
  }

  return allFiles;
}

/**
 * Upload a media file to Supabase Storage
 */
export async function uploadMediaFile(
  path: string,
  fileBody: Buffer | ArrayBuffer | Blob | File,
  options?: {
    contentType?: string;
    bucket?: string;
    upsert?: boolean;
  }
) {
  const client = getClient();
  if (!client) {
    throw new Error("Supabase client is not configured");
  }

  const bucket = options?.bucket || DEFAULT_BUCKET;
  const { data, error } = await client.storage.from(bucket).upload(path, fileBody, {
    contentType: options?.contentType,
    upsert: options?.upsert ?? true,
  });

  if (error) {
    throw error;
  }

  return {
    ...data,
    publicUrl: getMediaPublicUrl(path, bucket),
  };
}

/**
 * Delete a file or multiple files from Supabase Storage
 */
export async function deleteMediaFiles(
  paths: string[],
  bucket: string = DEFAULT_BUCKET
) {
  const client = getClient();
  if (!client) {
    throw new Error("Supabase client is not configured");
  }

  const { data, error } = await client.storage.from(bucket).remove(paths);
  if (error) {
    throw error;
  }

  return data;
}
