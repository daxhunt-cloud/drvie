export async function checkImageSafety(file: File): Promise<{ safe: boolean; reason?: string }> {
  try {
    const base64 = await fileToThumbnailBase64(file);
    const res = await fetch("/api/check-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 }),
    });
    return await res.json();
  } catch {
    return { safe: true };
  }
}

// Check multiple files in parallel, returns indices of unsafe ones
export async function checkImagesSafety(files: File[]): Promise<number[]> {
  const results = await Promise.all(files.map((f) => checkImageSafety(f)));
  return results.reduce<number[]>((acc, r, i) => { if (!r.safe) acc.push(i); return acc; }, []);
}

// Resize to small thumbnail before sending to API (much faster)
function fileToThumbnailBase64(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no canvas")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      URL.revokeObjectURL(img.src);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = () => reject(new Error("load failed"));
    img.src = URL.createObjectURL(file);
  });
}
