/**
 * Utility to compress images and read PDFs as base64 Data URLs client-side
 */

export interface ProcessedFile {
  dataUrl: string;
  name: string;
  type: 'image' | 'pdf';
  originalSizeKb: number;
  compressedSizeKb: number;
}

export async function processAndCompressFile(file: File): Promise<ProcessedFile> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const originalSizeKb = Math.round(file.size / 1024);

  if (isPdf) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          dataUrl,
          name: file.name,
          type: 'pdf',
          originalSizeKb,
          compressedSizeKb: originalSizeKb,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Handle Image compression via Canvas
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Max dimension 1200px
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compress as JPEG with 0.72 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        const compressedSizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

        resolve({
          dataUrl,
          name: file.name.replace(/\.[^/.]+$/, '.jpg'),
          type: 'image',
          originalSizeKb,
          compressedSizeKb,
        });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
