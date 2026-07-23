// Converts an image src (relative /img/... path, or already a data: URL from
// an uploaded photo) into a data: URL, since the AI try-on endpoint needs
// bytes it can forward to OpenRouter — a relative path only resolves against
// this app's own origin.
export async function toDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;

  const response = await fetch(src);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Downscales an uploaded photo before it ever becomes a data: URL. Phone
// camera photos can be several MB each; left uncompressed, one photo plus a
// full outfit's worth of garment images can approach the API's 20mb request
// cap. Product/preset images don't need this — they're already small.
export async function fileToResizedDataUrl(file: File, maxDim = 1600): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not read that image file."));
    el.src = rawDataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale === 1) return rawDataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return rawDataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}
