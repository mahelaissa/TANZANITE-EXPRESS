import fs from 'fs';
import path from 'path';
import { ProductImageMeta } from '../types/marketplace.ts';
import type { StoreSnapshot } from './store.ts';

export const PRODUCT_IMAGES_DIR = path.resolve(process.cwd(), '.mik-data', 'product-images');
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB strict backend limit

export type AllowedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{3,80}$/;

function assertSafeId(id: string, label: string): string {
  if (!SAFE_ID_REGEX.test(id)) {
    throw new Error(`Invalid ${label} identifier.`);
  }
  return id;
}

export function mimeToExtension(mime: AllowedImageMime): 'jpg' | 'png' | 'webp' {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export function detectImageMimeFromBuffer(buf: Buffer): AllowedImageMime | null {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;

  // Reject HTML / SVG / XML payloads explicitly
  const headText = buf.subarray(0, Math.min(buf.length, 256)).toString('utf-8').trimStart().toLowerCase();
  if (
    headText.startsWith('<svg') ||
    headText.startsWith('<?xml') ||
    headText.startsWith('<html') ||
    headText.startsWith('<!doctype')
  ) {
    return null;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

export function getImageDiskPath(supplierId: string, imageId: string, mimeType: AllowedImageMime): string {
  const safeSup = assertSafeId(supplierId, 'supplier');
  const safeImg = assertSafeId(imageId, 'image');
  const ext = mimeToExtension(mimeType);
  const resolved = path.resolve(PRODUCT_IMAGES_DIR, safeSup, `${safeImg}.${ext}`);
  if (!resolved.startsWith(PRODUCT_IMAGES_DIR + path.sep)) {
    throw new Error('Unsafe storage path rejected.');
  }
  return resolved;
}

export function saveProductImageFile(
  supplierId: string,
  imageId: string,
  mimeType: AllowedImageMime,
  buffer: Buffer
): { filePath: string; sizeBytes: number } {
  if (buffer.length === 0) {
    throw new Error('Image file is empty.');
  }
  if (buffer.length > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error('Image file exceeds 5 MB maximum size.');
  }
  const detected = detectImageMimeFromBuffer(buffer);
  if (!detected || detected !== mimeType) {
    throw new Error('Image signature does not match an allowed JPG, PNG, or WEBP file.');
  }

  const filePath = getImageDiskPath(supplierId, imageId, detected);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return { filePath, sizeBytes: buffer.length };
}

export function readProductImageFile(meta: ProductImageMeta): Buffer | null {
  try {
    const filePath = getImageDiskPath(meta.supplierId, meta.id, meta.mimeType);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

export function deleteProductImageFile(meta: ProductImageMeta): boolean {
  try {
    const filePath = getImageDiskPath(meta.supplierId, meta.id, meta.mimeType);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function extractMediaIdFromUrl(url: string): string | null {
  const match = url.trim().match(/^\/api\/media\/products\/([a-zA-Z0-9_-]{3,80})(?:\?.*)?$/);
  return match ? match[1] : null;
}

export function sanitizeFileName(name: string): string {
  const base = path.basename(name || 'product-image').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 120) || 'product-image';
}

export function findOrphanedMediaIds(store: StoreSnapshot, candidateUrls: string[]): string[] {
  const stillReferencedIds = new Set<string>();
  for (const prod of Object.values(store.products)) {
    for (const url of prod.images || []) {
      const id = extractMediaIdFromUrl(url);
      if (id) stillReferencedIds.add(id);
    }
  }
  const orphaned: string[] = [];
  for (const url of candidateUrls) {
    const id = extractMediaIdFromUrl(url);
    if (id && !stillReferencedIds.has(id) && store.productImages[id]) {
      orphaned.push(id);
    }
  }
  return Array.from(new Set(orphaned));
}
