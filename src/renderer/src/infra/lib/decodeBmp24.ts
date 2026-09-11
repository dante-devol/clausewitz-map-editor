// Decodes an uncompressed 24bpp Windows BMP (BI_RGB, no color table) directly
// from its bytes, with no browser APIs (no createImageBitmap/OffscreenCanvas).
// HOI4's provinces.bmp is exactly this format. Output matches what
// ctx.getImageData(...) would produce for the same file — RGBA,
// Uint8ClampedArray, row-major, row 0 = top of image — so this is a drop-in
// replacement for the createImageBitmap+canvas decode path used in three
// places (BmpProvinceMapSource, the bitmap-analysis worker, useOverlayAssets),
// and is plain, pure, synchronous code that needs no DOM to test or run.
export interface DecodedBmp {
  width: number
  height: number
  // RGBA, row-major, row 0 = top of image, alpha always 255.
  pixels: Uint8ClampedArray
}

export function decodeBmp24(buffer: ArrayBuffer | ArrayBufferView): DecodedBmp {
  const buf = buffer instanceof ArrayBuffer ? new DataView(buffer) : new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  const sig = String.fromCharCode(buf.getUint8(0), buf.getUint8(1))
  if (sig !== 'BM') throw new Error(`not a BMP file (signature "${sig}")`)

  const dataOffset = buf.getUint32(10, true)
  const dibHeaderSize = buf.getUint32(14, true)
  const width = buf.getInt32(18, true)
  const heightRaw = buf.getInt32(22, true)
  const bitsPerPixel = buf.getUint16(28, true)
  const compression = buf.getUint32(30, true)

  if (compression !== 0) throw new Error(`unsupported BMP compression ${compression} (only BI_RGB/0 is supported)`)
  if (bitsPerPixel !== 24) throw new Error(`unsupported BMP bit depth ${bitsPerPixel} (only 24bpp is supported)`)
  if (dataOffset !== 14 + dibHeaderSize) throw new Error('unsupported BMP: a color table is present')

  const topDown = heightRaw < 0
  const height = Math.abs(heightRaw)
  const bytesPerPixel = 3
  const rowSize = Math.floor((bitsPerPixel * width + 31) / 32) * 4

  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    // BMP stores rows bottom-up by default (positive height); a negative
    // height means the file already stores rows top-down.
    const srcRow = topDown ? y : height - 1 - y
    const rowStart = dataOffset + srcRow * rowSize
    for (let x = 0; x < width; x++) {
      const srcOffset = rowStart + x * bytesPerPixel
      const dstOffset = (y * width + x) * 4
      // BMP pixel order is BGR.
      pixels[dstOffset] = buf.getUint8(srcOffset + 2)
      pixels[dstOffset + 1] = buf.getUint8(srcOffset + 1)
      pixels[dstOffset + 2] = buf.getUint8(srcOffset)
      pixels[dstOffset + 3] = 255
    }
  }

  return { width, height, pixels }
}
