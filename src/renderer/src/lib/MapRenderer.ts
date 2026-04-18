// Vertex shader: maps a [0,1]×[0,1] unit quad to clip space via a mat3 transform.
// UV passes straight through: texImage2D stores the ImageBitmap with row 0 (top)
// at V=0, matching the quad's own Y direction, so no flip is needed here.
const VERT = `
  attribute vec2 a_pos;
  uniform mat3 u_matrix;
  varying vec2 v_uv;
  void main() {
    vec3 p = u_matrix * vec3(a_pos, 1.0);
    gl_Position = vec4(p.xy, 0.0, 1.0);
    v_uv = a_pos;
  }
`

const FRAG = `
  precision mediump float;
  uniform sampler2D u_tex;
  varying vec2 v_uv;
  void main() {
    gl_FragColor = texture2D(u_tex, v_uv);
  }
`

// Two triangles covering [0,1]×[0,1].
const QUAD = new Float32Array([
  0, 0,  1, 0,  0, 1,
  1, 0,  1, 1,  0, 1
])

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(`Shader error: ${gl.getShaderInfoLog(s)}`)
  return s
}

export class MapRenderer {
  private readonly gl: WebGLRenderingContext
  private readonly program: WebGLProgram
  private readonly quadBuffer: WebGLBuffer
  private readonly posLoc: number
  private readonly matrixLoc: WebGLUniformLocation
  private readonly texLoc: WebGLUniformLocation
  // Pre-allocated to avoid GC pressure during frequent render calls.
  private readonly matrixData = new Float32Array([1,0,0, 0,1,0, 0,0,1])
  private texture: WebGLTexture | null = null
  private _imageSize = { width: 0, height: 0 }
  // CPU-side pixel data for edge-mask queries. Populated on image load.
  private pixelData: Uint8ClampedArray | null = null
  private pixelDataWidth = 0
  // Single cached edge mask for the current selection; replaced on color change.
  private edgeMaskCanvas: OffscreenCanvas | null = null
  private edgeMaskColor = -1
  // Province pixel count for the last computed mask — used by the renderer to
  // scale glow size based on how large the province appears on screen.
  edgeMaskProvincePixels = 0
  // Centroid of the last computed mask in image-space coordinates.
  edgeMaskCentroid: { x: number; y: number } | null = null

  get imageSize() { return this._imageSize }

  constructor(canvas: HTMLCanvasElement) {
    // preserveDrawingBuffer lets readPixels work outside the render call.
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true })
    if (!gl) throw new Error('WebGL not available')
    this.gl = gl

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT)
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram()!
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(`Link error: ${gl.getProgramInfoLog(program)}`)
    gl.deleteShader(vert)
    gl.deleteShader(frag)
    this.program = program

    this.posLoc    = gl.getAttribLocation(program, 'a_pos')
    this.matrixLoc = gl.getUniformLocation(program, 'u_matrix')!
    this.texLoc    = gl.getUniformLocation(program, 'u_tex')!

    this.quadBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW)

    gl.clearColor(0, 0, 0, 0)
  }

  // Decodes the image off the main thread via createImageBitmap, uploads it as a
  // GPU texture, and caches a CPU-side copy for edge-mask queries.
  async loadImage(src: string): Promise<void> {
    const blob   = await fetch(src).then((r) => r.blob())
    const bitmap = await createImageBitmap(blob)
    const { gl } = this

    this._imageSize = { width: bitmap.width, height: bitmap.height }
    this.edgeMaskCanvas = null
    this.edgeMaskColor  = -1

    // Draw to an offscreen 2D canvas to get raw pixel data for CPU queries.
    const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx2d     = offscreen.getContext('2d')!
    ctx2d.drawImage(bitmap, 0, 0)
    const imageData     = ctx2d.getImageData(0, 0, bitmap.width, bitmap.height)
    this.pixelData      = imageData.data
    this.pixelDataWidth = bitmap.width

    if (this.texture) gl.deleteTexture(this.texture)
    this.texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap)
    // Non-power-of-two textures require CLAMP_TO_EDGE.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    // Smooth when zoomed out; nearest-neighbour (pixel-precise) when zoomed in.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    bitmap.close()
  }

  render(tx: number, ty: number, scale: number): void {
    const { gl } = this
    if (!this.texture || this._imageSize.width === 0) return

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.program)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.enableVertexAttribArray(this.posLoc)
    gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0)

    gl.uniformMatrix3fv(this.matrixLoc, false, this.buildMatrix(tx, ty, scale))
    gl.uniform1i(this.texLoc, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  clearImage(): void {
    const { gl } = this
    if (this.texture) { gl.deleteTexture(this.texture); this.texture = null }
    this._imageSize          = { width: 0, height: 0 }
    this.pixelData           = null
    this.pixelDataWidth      = 0
    this.edgeMaskCanvas      = null
    this.edgeMaskColor       = -1
    this.edgeMaskCentroid    = null
    this.edgeMaskProvincePixels = 0
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  // Reads the RGBA value at a canvas-pixel coordinate.
  // Returns null when the coordinate falls outside the rendered image (alpha = 0).
  readPixel(canvasX: number, canvasY: number): { r: number; g: number; b: number } | null {
    const { gl } = this
    const buf = new Uint8Array(4)
    // WebGL y=0 is at the bottom; canvas y=0 is at the top.
    const glY = gl.drawingBufferHeight - Math.floor(canvasY) - 1
    gl.readPixels(Math.floor(canvasX), glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf)
    if (buf[3] === 0) return null
    return { r: buf[0], g: buf[1], b: buf[2] }
  }

  // Reads the original province color at a canvas coordinate, independent of any
  // active colorMap. Maps canvas → image space via the current pan/zoom transform.
  readOriginalPixel(
    canvasX: number, canvasY: number,
    tx: number, ty: number, scale: number
  ): { r: number; g: number; b: number } | null {
    const pixels = this.pixelData
    if (!pixels) return null
    const imgX = Math.floor((canvasX - tx) / scale)
    const imgY = Math.floor((canvasY - ty) / scale)
    const tw = this.pixelDataWidth
    const th = this._imageSize.height
    if (imgX < 0 || imgX >= tw || imgY < 0 || imgY >= th) return null
    const i = (imgY * tw + imgX) * 4
    if (pixels[i + 3] === 0) return null
    return { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] }
  }

  // Builds an OffscreenCanvas the same size as the source image with white pixels
  // wherever a province-colored pixel has at least one 4-connected neighbour of a
  // different color (i.e. the per-pixel boundary of the region).
  // The result is cached for the current color; only one mask is kept at a time.
  computeEdgeMask(packedColor: number): OffscreenCanvas | null {
    if (this.edgeMaskColor === packedColor && this.edgeMaskCanvas) return this.edgeMaskCanvas

    const pixels = this.pixelData
    if (!pixels) return null

    const tw = this.pixelDataWidth
    const th = this._imageSize.height
    const tr = (packedColor >> 16) & 0xff
    const tg = (packedColor >>  8) & 0xff
    const tb =  packedColor        & 0xff

    const canvas  = new OffscreenCanvas(tw, th)
    const ctx     = canvas.getContext('2d')!
    const imgData = ctx.createImageData(tw, th)
    const out     = imgData.data

    let provincePixelCount = 0
    let sumX = 0, sumY = 0
    for (let y = 0; y < th; y++) {
      const row = y * tw
      for (let x = 0; x < tw; x++) {
        const i = (row + x) * 4
        // Skip pixels that belong to the province — we want the ring outside it.
        if (pixels[i] === tr && pixels[i + 1] === tg && pixels[i + 2] === tb) {
          provincePixelCount++
          sumX += x
          sumY += y
          continue
        }

        // Mark if any cardinal neighbour belongs to the province.
        const isEdge =
          (y > 0    && pixels[(row - tw + x) * 4] === tr && pixels[(row - tw + x) * 4 + 1] === tg && pixels[(row - tw + x) * 4 + 2] === tb) ||
          (y < th-1 && pixels[(row + tw + x) * 4] === tr && pixels[(row + tw + x) * 4 + 1] === tg && pixels[(row + tw + x) * 4 + 2] === tb) ||
          (x > 0    && pixels[(row + x - 1)  * 4] === tr && pixels[(row + x - 1)  * 4 + 1] === tg && pixels[(row + x - 1)  * 4 + 2] === tb) ||
          (x < tw-1 && pixels[(row + x + 1)  * 4] === tr && pixels[(row + x + 1)  * 4 + 1] === tg && pixels[(row + x + 1)  * 4 + 2] === tb)

        if (isEdge) {
          out[i] = out[i + 1] = out[i + 2] = 255
          out[i + 3] = 255
        }
      }
    }

    ctx.putImageData(imgData, 0, 0)
    this.edgeMaskCanvas         = canvas
    this.edgeMaskColor          = packedColor
    this.edgeMaskProvincePixels = provincePixelCount
    this.edgeMaskCentroid       = provincePixelCount > 0
      ? { x: sumX / provincePixelCount, y: sumY / provincePixelCount }
      : null
    return canvas
  }

  // Remaps every pixel using colorMap (provincePackedColor → displayPackedColor).
  // Pixels with no mapping get a neutral dark fill. Does not touch pixelData —
  // restoreOriginalTexture() can undo this at any time.
  recolorTexture(colorMap: Map<number, number>): void {
    const pixels = this.pixelData
    if (!pixels || !this.texture) return
    const { gl } = this
    const tw = this.pixelDataWidth
    const th = this._imageSize.height
    const out = new Uint8Array(tw * th * 4)
    for (let i = 0; i < pixels.length; i += 4) {
      const packed = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]
      const mapped = colorMap.get(packed) ?? 0x404040
      out[i]     = (mapped >> 16) & 0xff
      out[i + 1] = (mapped >>  8) & 0xff
      out[i + 2] =  mapped        & 0xff
      out[i + 3] = pixels[i + 3]
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, out)
  }

  restoreOriginalTexture(): void {
    const pixels = this.pixelData
    if (!pixels || !this.texture) return
    const { gl } = this
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      this.pixelDataWidth, this._imageSize.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, pixels
    )
  }

  dispose(): void {
    const { gl } = this
    if (this.texture) gl.deleteTexture(this.texture)
    gl.deleteBuffer(this.quadBuffer)
    gl.deleteProgram(this.program)
  }

  // Builds the column-major mat3 that maps the unit quad [0,1]×[0,1] to
  // clip space given a canvas-pixel pan (tx, ty) and zoom scale.
  private buildMatrix(tx: number, ty: number, scale: number): Float32Array {
    const cw = this.gl.drawingBufferWidth
    const ch = this.gl.drawingBufferHeight
    const { width: iw, height: ih } = this._imageSize
    const m = this.matrixData
    m[0] = iw * scale * 2 / cw
    m[1] = 0; m[2] = 0
    m[3] = 0
    m[4] = -(ih * scale * 2 / ch)
    m[5] = 0
    m[6] = tx * 2 / cw - 1
    m[7] = 1 - ty * 2 / ch
    m[8] = 1
    return m
  }
}
