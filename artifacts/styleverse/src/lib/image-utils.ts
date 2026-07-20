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
