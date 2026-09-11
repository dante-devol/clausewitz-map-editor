// Builds tiny, real-format 24bpp BMP buffers for testing decodeBmp24 without
// needing a real provinces.bmp or any browser canvas API.
export function encodeBmp24(
  width: number,
  height: number,
  // (x, y) -> [r, g, b], y=0 is the top of the image regardless of storage direction.
  getPixel: (x: number, y: number) => readonly [number, number, number],
  options: { topDown?: boolean } = {}
): Uint8Array {
  const topDown = options.topDown ?? false
  const bytesPerPixel = 3
  const rowSize = Math.floor((24 * width + 31) / 32) * 4
  const dataOffset = 54 // 14-byte file header + 40-byte BITMAPINFOHEADER, no color table
  const pixelDataSize = rowSize * height
  const fileSize = dataOffset + pixelDataSize

  const buf = new ArrayBuffer(fileSize)
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)

  bytes[0] = 0x42 // 'B'
  bytes[1] = 0x4d // 'M'
  view.setUint32(2, fileSize, true)
  view.setUint32(10, dataOffset, true)
  view.setUint32(14, 40, true) // BITMAPINFOHEADER size
  view.setInt32(18, width, true)
  view.setInt32(22, topDown ? -height : height, true)
  view.setUint16(26, 1, true) // planes
  view.setUint16(28, 24, true) // bpp
  view.setUint32(30, 0, true) // BI_RGB
  view.setUint32(34, pixelDataSize, true)

  for (let y = 0; y < height; y++) {
    const fileRow = topDown ? y : height - 1 - y
    const rowStart = dataOffset + fileRow * rowSize
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixel(x, y)
      const offset = rowStart + x * bytesPerPixel
      bytes[offset] = b
      bytes[offset + 1] = g
      bytes[offset + 2] = r
    }
  }

  return bytes
}
