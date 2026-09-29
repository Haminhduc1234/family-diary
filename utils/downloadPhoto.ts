function forceDownload(blobUrl: string, filename: string) {
  const a = document.createElement("a");
  a.download = filename;
  a.href = blobUrl;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default async function downloadPhoto(url: string, filename?: string) {
  if (!filename) {
    const cleanUrl = url.split("?")[0];
    filename = cleanUrl.split("\\").pop()?.split("/").pop() || "media";
  }

  try {
    const response = await fetch(url, {
      mode: "cors",
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    forceDownload(blobUrl, filename);
    window.URL.revokeObjectURL(blobUrl);
  } catch (e) {
    console.warn("Direct blob download failed, triggering standard download link:", e);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
