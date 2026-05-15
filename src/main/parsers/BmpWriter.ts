import { writeFileSync } from 'fs'

// Write a 24bpp bottom-up RGB BMP file from top-down RGBA pixel data.
// HOI4 province maps use 24bpp RGB BMPs with no compression.
export function writeBmp(
  outputPath: string,
  rgbaData: Uint8Array | number[],
  width: number,
  height: number
): void {
  // Row stride must be padded to 4-byte boundary.
  const rowStride = Math.ceil((width * 3) / 4) * 4
  const pixelDataSize = rowStride * height
  const fileSize = 54 + pixelDataSize

  const buf = Buffer.alloc(fileSize, 0)
  let off = 0

  // BITMAPFILEHEADER (14 bytes)
  buf.write('BM', off); off += 2
  buf.writeUInt32LE(fileSize, off); off += 4
  buf.writeUInt32LE(0, off); off += 4          // reserved
  buf.writeUInt32LE(54, off); off += 4          // pixel data offset

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, off); off += 4          // header size
  buf.writeInt32LE(width, off); off += 4
  buf.writeInt32LE(height, off); off += 4       // positive = bottom-up
  buf.writeUInt16LE(1, off); off += 2           // color planes
  buf.writeUInt16LE(24, off); off += 2          // bits per pixel
  buf.writeUInt32LE(0, off); off += 4           // compression (BI_RGB)
  buf.writeUInt32LE(pixelDataSize, off); off += 4
  buf.writeInt32LE(2835, off); off += 4         // x pixels/meter (~72 dpi)
  buf.writeInt32LE(2835, off); off += 4         // y pixels/meter
  buf.writeUInt32LE(0, off); off += 4           // colors in table
  buf.writeUInt32LE(0, off); off += 4           // important colors

  // Pixel data: BMP is bottom-up, source is top-down, stored as BGR.
  for (let row = 0; row < height; row++) {
    const bmpRow = height - 1 - row
    const rowBase = off + bmpRow * rowStride
    for (let col = 0; col < width; col++) {
      const srcOff = (row * width + col) * 4
      const dstOff = rowBase + col * 3
      buf[dstOff]     = rgbaData[srcOff + 2]  // B
      buf[dstOff + 1] = rgbaData[srcOff + 1]  // G
      buf[dstOff + 2] = rgbaData[srcOff]      // R
    }
  }

  writeFileSync(outputPath, buf)
}
