import { buildProvinceIndex, computeEdgeMask } from './provinceAnalysis'
import type { ProvinceMapSource } from './ProvinceMapSource'
import type { EdgeMaskResult, ProvinceIndex } from './provinceAnalysis'

// Vertex shader: maps [0,1]×[0,1] unit quad to clip space via a mat3.
// UV passes straight through — texImage2D row 0 (top) is at V=0, matching quad Y.
const VERT = `#version 300 es
in vec2 a_pos;
uniform mat3 u_matrix;
out vec2 v_uv;
void main() {
  vec3 p = u_matrix * vec3(a_pos, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
  v_uv = a_pos;
}
`

// Fragment shader: unpacks the province ID from the RG channels of the ID
// texture (R = low byte, G = high byte), then looks up the palette color.
// The palette is a 256-column 2D texture: column = lo byte, row = hi byte.
// This keeps the texture width fixed at 256 regardless of province count.
const FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_id_tex;
uniform sampler2D u_palette_tex;
uniform int u_palette_height;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec4 packed = texture(u_id_tex, v_uv);
  float lo = packed.r;
  float hi = packed.g;
  float pu = (lo * 255.0 + 0.5) / 256.0;
  float pv = (hi * 255.0 + 0.5) / float(u_palette_height);
  fragColor = texture(u_palette_tex, vec2(pu, pv));
}
`

const OVERLAY_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
uniform float u_opacity;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec4 color = texture(u_tex, v_uv);
  fragColor = vec4(color.rgb, color.a * u_opacity);
}
`

// Fullscreen vertex shader for FBO-to-FBO blur passes and the final composite.
// Maps [0,1]×[0,1] quad to clip space with no transform — fills the screen.
const VERT_FULLSCREEN = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0);
  v_uv = a_pos;
}
`

// Simple RGBA passthrough — used to blit the edge mask into the edgeFBO.
const FRAG_EDGE = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  fragColor = texture(u_tex, v_uv);
}
`

// Separable 13-tap Gaussian blur. u_direction carries the per-axis texel step
// already scaled by the adaptive blur radius:
//   horizontal pass: vec2(blurRadius / screenW, 0)
//   vertical pass:   vec2(0, blurRadius / screenH)
const FRAG_BLUR = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_direction;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  float w[7] = float[7](0.1847, 0.1623, 0.1113, 0.0596, 0.0249, 0.0081, 0.0020);
  vec4 result = texture(u_tex, v_uv) * w[0];
  for (int i = 1; i < 7; i++) {
    vec2 off = u_direction * float(i);
    result += texture(u_tex, v_uv + off) * w[i];
    result += texture(u_tex, v_uv - off) * w[i];
  }
  fragColor = result;
}
`

// Glow composite — blits the blurred glow texture additively scaled by u_glow_alpha.
const FRAG_GLOW = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
uniform float u_glow_alpha;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec4 color = texture(u_tex, v_uv);
  fragColor = vec4(color.rgb, color.a * u_glow_alpha);
}
`

const QUAD = new Float32Array([
  0, 0,  1, 0,  0, 1,
  1, 0,  1, 1,  0, 1,
])

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(`Shader compile error: ${gl.getShaderInfoLog(s)}`)
  return s
}

export class MapRenderer {
  private readonly gl: WebGL2RenderingContext
  private readonly program: WebGLProgram
  private readonly quadBuffer: WebGLBuffer
  private readonly posLoc: number
  private readonly matrixLoc: WebGLUniformLocation
  private readonly idTexLoc: WebGLUniformLocation
  private readonly paletteTexLoc: WebGLUniformLocation
  private readonly paletteHeightLoc: WebGLUniformLocation
  private paletteHeight = 1
  private readonly overlayProgram: WebGLProgram
  private readonly overlayPosLoc: number
  private readonly overlayMatrixLoc: WebGLUniformLocation
  private readonly overlayTexLoc: WebGLUniformLocation
  private readonly overlayOpacityLoc: WebGLUniformLocation
  private overlayEntries: { id: string; texture: WebGLTexture; opacity: number }[] = []

  // --- Glow / edge-mask pipeline ---
  private edgeMaskTexture: WebGLTexture | null = null

  // Screen-space FBOs for Gaussian blur passes.
  private edgeFBO:  { fbo: WebGLFramebuffer; tex: WebGLTexture } | null = null
  private blurHFBO: { fbo: WebGLFramebuffer; tex: WebGLTexture } | null = null
  private blurVFBO: { fbo: WebGLFramebuffer; tex: WebGLTexture } | null = null
  private fboWidth  = 0
  private fboHeight = 0

  // Edge blit program (base VERT + FRAG_EDGE): draws edge mask to edgeFBO using map transform.
  private readonly edgeBlitProgram: WebGLProgram
  private readonly edgeBlitPosLoc: number
  private readonly edgeBlitMatrixLoc: WebGLUniformLocation
  private readonly edgeBlitTexLoc: WebGLUniformLocation

  // Gaussian blur program (VERT_FULLSCREEN + FRAG_BLUR): shared for H and V passes.
  private readonly blurProgram: WebGLProgram
  private readonly blurPosLoc: number
  private readonly blurTexLoc: WebGLUniformLocation
  private readonly blurDirectionLoc: WebGLUniformLocation

  // Glow composite program (VERT_FULLSCREEN + FRAG_GLOW): blends blurred glow over scene.
  private readonly glowCompProgram: WebGLProgram
  private readonly glowCompPosLoc: number
  private readonly glowCompTexLoc: WebGLUniformLocation
  private readonly glowCompAlphaLoc: WebGLUniformLocation

  // Pre-allocated; avoids GC pressure on every render call.
  private readonly matrixData = new Float32Array(9)

  private idTexture: WebGLTexture | null = null
  private paletteTexture: WebGLTexture | null = null
  // CPU-side original pixel data — kept for readOriginalPixel and computeEdgeMask.
  private pixelData: Uint8ClampedArray | null = null
  private pixelDataWidth = 0
  private provinceIndex: ProvinceIndex | null = null
  // Palette buffer reused across recolor calls. Sized to provinceCount + 1 (index 0 = unmapped).
  private paletteData: Uint8Array | null = null

  private _imageSize = { width: 0, height: 0 }

  // Cached edge mask for the current selection.
  private cachedEdgeMask: EdgeMaskResult | null = null
  private edgeMaskColor = -1

  // Public — read by MapCanvas for adaptive glow sizing and viewport centering.
  edgeMaskProvincePixels = 0
  edgeMaskCentroid: { x: number; y: number } | null = null

  get imageSize() { return this._imageSize }

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true }) as WebGL2RenderingContext | null
    if (!gl) throw new Error('WebGL2 not available')
    this.gl = gl

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT)
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram()!
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(`Shader link error: ${gl.getProgramInfoLog(program)}`)
    gl.deleteShader(vert)
    gl.deleteShader(frag)
    this.program = program

    this.posLoc         = gl.getAttribLocation(program, 'a_pos')
    this.matrixLoc      = gl.getUniformLocation(program, 'u_matrix')!
    this.idTexLoc        = gl.getUniformLocation(program, 'u_id_tex')!
    this.paletteTexLoc   = gl.getUniformLocation(program, 'u_palette_tex')!
    this.paletteHeightLoc = gl.getUniformLocation(program, 'u_palette_height')!

    this.quadBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW)

    gl.clearColor(0, 0, 0, 0)

    const overlayVert = compileShader(gl, gl.VERTEX_SHADER, VERT)
    const overlayFrag = compileShader(gl, gl.FRAGMENT_SHADER, OVERLAY_FRAG)
    const overlayProgram = gl.createProgram()!
    gl.attachShader(overlayProgram, overlayVert)
    gl.attachShader(overlayProgram, overlayFrag)
    gl.linkProgram(overlayProgram)
    if (!gl.getProgramParameter(overlayProgram, gl.LINK_STATUS))
      throw new Error(`Overlay shader link error: ${gl.getProgramInfoLog(overlayProgram)}`)
    gl.deleteShader(overlayVert)
    gl.deleteShader(overlayFrag)
    this.overlayProgram = overlayProgram
    this.overlayPosLoc    = gl.getAttribLocation(overlayProgram, 'a_pos')
    this.overlayMatrixLoc = gl.getUniformLocation(overlayProgram, 'u_matrix')!
    this.overlayTexLoc    = gl.getUniformLocation(overlayProgram, 'u_tex')!
    this.overlayOpacityLoc = gl.getUniformLocation(overlayProgram, 'u_opacity')!

    // Edge blit program: reuses the base VERT, simple RGBA passthrough frag.
    const edgeBlitVert = compileShader(gl, gl.VERTEX_SHADER, VERT)
    const edgeBlitFrag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_EDGE)
    const edgeBlitProg = gl.createProgram()!
    gl.attachShader(edgeBlitProg, edgeBlitVert)
    gl.attachShader(edgeBlitProg, edgeBlitFrag)
    gl.linkProgram(edgeBlitProg)
    if (!gl.getProgramParameter(edgeBlitProg, gl.LINK_STATUS))
      throw new Error(`Edge blit shader link error: ${gl.getProgramInfoLog(edgeBlitProg)}`)
    gl.deleteShader(edgeBlitVert)
    gl.deleteShader(edgeBlitFrag)
    this.edgeBlitProgram   = edgeBlitProg
    this.edgeBlitPosLoc    = gl.getAttribLocation(edgeBlitProg, 'a_pos')
    this.edgeBlitMatrixLoc = gl.getUniformLocation(edgeBlitProg, 'u_matrix')!
    this.edgeBlitTexLoc    = gl.getUniformLocation(edgeBlitProg, 'u_tex')!

    // Gaussian blur program.
    const blurVert = compileShader(gl, gl.VERTEX_SHADER, VERT_FULLSCREEN)
    const blurFrag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_BLUR)
    const blurProg = gl.createProgram()!
    gl.attachShader(blurProg, blurVert)
    gl.attachShader(blurProg, blurFrag)
    gl.linkProgram(blurProg)
    if (!gl.getProgramParameter(blurProg, gl.LINK_STATUS))
      throw new Error(`Blur shader link error: ${gl.getProgramInfoLog(blurProg)}`)
    gl.deleteShader(blurVert)
    gl.deleteShader(blurFrag)
    this.blurProgram      = blurProg
    this.blurPosLoc       = gl.getAttribLocation(blurProg, 'a_pos')
    this.blurTexLoc       = gl.getUniformLocation(blurProg, 'u_tex')!
    this.blurDirectionLoc = gl.getUniformLocation(blurProg, 'u_direction')!

    // Glow composite program.
    const glowVert = compileShader(gl, gl.VERTEX_SHADER, VERT_FULLSCREEN)
    const glowFrag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_GLOW)
    const glowProg = gl.createProgram()!
    gl.attachShader(glowProg, glowVert)
    gl.attachShader(glowProg, glowFrag)
    gl.linkProgram(glowProg)
    if (!gl.getProgramParameter(glowProg, gl.LINK_STATUS))
      throw new Error(`Glow composite shader link error: ${gl.getProgramInfoLog(glowProg)}`)
    gl.deleteShader(glowVert)
    gl.deleteShader(glowFrag)
    this.glowCompProgram  = glowProg
    this.glowCompPosLoc   = gl.getAttribLocation(glowProg, 'a_pos')
    this.glowCompTexLoc   = gl.getUniformLocation(glowProg, 'u_tex')!
    this.glowCompAlphaLoc = gl.getUniformLocation(glowProg, 'u_glow_alpha')!
  }

  async loadImage(source: ProvinceMapSource): Promise<void> {
    const { gl } = this
    const { width, height, pixelData, imageBitmap } = source

    this._imageSize   = { width, height }
    this.pixelData    = pixelData
    this.pixelDataWidth = width
    this.edgeMaskColor  = -1
    this.cachedEdgeMask = null
    this.edgeMaskCentroid = null
    this.edgeMaskProvincePixels = 0

    // Build province index (one O(W×H) pass; never repeated for this image).
    const index = buildProvinceIndex({ data: pixelData, width, height })
    this.provinceIndex = index

    // Province ID texture — RGBA8, R=low byte of ID, G=high byte of ID.
    // Stored as a standard float texture to avoid integer texture driver issues.
    // NEAREST filtering is mandatory: interpolating between province IDs is nonsensical.
    const idRgba = new Uint8Array(width * height * 4)
    for (let i = 0; i < index.idData.length; i++) {
      const id = index.idData[i]
      idRgba[i * 4]     = id & 0xff
      idRgba[i * 4 + 1] = (id >> 8) & 0xff
      idRgba[i * 4 + 2] = 0
      idRgba[i * 4 + 3] = 255
    }
    if (this.idTexture) gl.deleteTexture(this.idTexture)
    this.idTexture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.idTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, idRgba)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    // Palette texture — 256 columns × N rows, RGBA.
    // Column = lo byte of province ID, row = hi byte. Width is fixed at 256 so it
    // never exceeds MAX_TEXTURE_SIZE regardless of province count (max 65535 provinces
    // = 256 rows). Linear layout id*4 aligns naturally with (id%256, id/256).
    const paletteSize   = index.provinceCount + 1
    const paletteHeight = Math.ceil(paletteSize / 256)
    const paletteData   = new Uint8Array(256 * paletteHeight * 4)
    // Index 0: unmapped / transparent pixels → neutral dark gray.
    paletteData[0] = paletteData[1] = paletteData[2] = 0x40
    paletteData[3] = 0xff
    for (const [packed, id] of index.colorToId) {
      const base  = id * 4
      paletteData[base]     = (packed >> 16) & 0xff
      paletteData[base + 1] = (packed >>  8) & 0xff
      paletteData[base + 2] =  packed        & 0xff
      paletteData[base + 3] = 0xff
    }
    this.paletteData   = paletteData
    this.paletteHeight = paletteHeight

    if (this.paletteTexture) gl.deleteTexture(this.paletteTexture)
    this.paletteTexture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, paletteHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, paletteData)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    // Upload the original image as a display reference (not used for color lookup anymore,
    // but we still need imageBitmap closed — the source caller owns that lifecycle).
    // No additional RGBA texture needed — color comes fully from palette.
    void imageBitmap
  }

  setOverlayTextures(
    entries: { id: string; source: ImageBitmap | OffscreenCanvas; opacity: number }[]
  ): void {
    const { gl } = this
    // Delete all existing overlay textures before uploading new set.
    for (const entry of this.overlayEntries) gl.deleteTexture(entry.texture)
    this.overlayEntries = []

    for (const e of entries) {
      const texture = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, e.source)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      this.overlayEntries.push({ id: e.id, texture, opacity: e.opacity })
    }
  }

  // Computes the edge mask for the given province color and uploads it as a WebGL
  // texture for the GPU glow pipeline. Pass null to clear the glow.
  setHighlightColor(packedColor: number | null): void {
    const { gl } = this
    if (packedColor === null) {
      if (this.edgeMaskTexture) { gl.deleteTexture(this.edgeMaskTexture); this.edgeMaskTexture = null }
      return
    }
    const mask = this.computeEdgeMask(packedColor)
    if (!mask) return
    if (!this.edgeMaskTexture) this.edgeMaskTexture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.edgeMaskTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  }

  render(tx: number, ty: number, scale: number, glowAlpha = 0): void {
    const { gl } = this
    if (!this.idTexture || !this.paletteTexture || this._imageSize.width === 0) return

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.program)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.enableVertexAttribArray(this.posLoc)
    gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0)

    gl.uniformMatrix3fv(this.matrixLoc, false, this.buildMatrix(tx, ty, scale))

    // Texture unit 0 — province ID texture (integer).
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.idTexture)
    gl.uniform1i(this.idTexLoc, 0)

    // Texture unit 1 — palette texture (float RGBA).
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture)
    gl.uniform1i(this.paletteTexLoc, 1)

    gl.uniform1i(this.paletteHeightLoc, this.paletteHeight)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    if (this.overlayEntries.length > 0) {
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(this.overlayProgram)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
      gl.enableVertexAttribArray(this.overlayPosLoc)
      gl.vertexAttribPointer(this.overlayPosLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniformMatrix3fv(this.overlayMatrixLoc, false, this.buildMatrix(tx, ty, scale))
      gl.uniform1i(this.overlayTexLoc, 0)
      gl.activeTexture(gl.TEXTURE0)
      for (const entry of this.overlayEntries) {
        gl.bindTexture(gl.TEXTURE_2D, entry.texture)
        gl.uniform1f(this.overlayOpacityLoc, entry.opacity)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      }
      gl.disable(gl.BLEND)
    }

    // Glow pipeline: runs only when a province is selected and alpha is non-zero.
    if (this.edgeMaskTexture && glowAlpha > 0) {
      this.ensureFbos()
      if (!this.edgeFBO || !this.blurHFBO || !this.blurVFBO) return

      const w = gl.drawingBufferWidth
      const h = gl.drawingBufferHeight

      // Adaptive blur radius — small provinces get boosted so they stay visible
      // when zoomed out (matches the boost logic previously in MapCanvas drawOverlay).
      const screenArea = Math.max(1, this.edgeMaskProvincePixels * scale * scale)
      const t = Math.max(0, 1 - screenArea / 8_000)
      const boost = 1 + 5 * Math.sqrt(t)
      const blurRadius = 12 * boost

      // Pass 1: Blit edge mask texture into edgeFBO using the map transform.
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.edgeFBO.fbo)
      gl.viewport(0, 0, w, h)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(this.edgeBlitProgram)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
      gl.enableVertexAttribArray(this.edgeBlitPosLoc)
      gl.vertexAttribPointer(this.edgeBlitPosLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniformMatrix3fv(this.edgeBlitMatrixLoc, false, this.buildMatrix(tx, ty, scale))
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.edgeMaskTexture)
      gl.uniform1i(this.edgeBlitTexLoc, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Pass 2: Horizontal Gaussian blur (edgeFBO → blurHFBO).
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurHFBO.fbo)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(this.blurProgram)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
      gl.enableVertexAttribArray(this.blurPosLoc)
      gl.vertexAttribPointer(this.blurPosLoc, 2, gl.FLOAT, false, 0, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.edgeFBO.tex)
      gl.uniform1i(this.blurTexLoc, 0)
      gl.uniform2f(this.blurDirectionLoc, blurRadius / w, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Pass 3: Vertical Gaussian blur (blurHFBO → blurVFBO).
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurVFBO.fbo)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.bindTexture(gl.TEXTURE_2D, this.blurHFBO.tex)
      gl.uniform2f(this.blurDirectionLoc, 0, blurRadius / h)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Pass 4: Composite blurred glow over the scene with additive blending.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, w, h)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
      gl.useProgram(this.glowCompProgram)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
      gl.enableVertexAttribArray(this.glowCompPosLoc)
      gl.vertexAttribPointer(this.glowCompPosLoc, 2, gl.FLOAT, false, 0, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.blurVFBO.tex)
      gl.uniform1i(this.glowCompTexLoc, 0)
      gl.uniform1f(this.glowCompAlphaLoc, glowAlpha)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.disable(gl.BLEND)
    }

    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  clearImage(): void {
    const { gl } = this
    if (this.idTexture)      { gl.deleteTexture(this.idTexture);      this.idTexture = null }
    if (this.paletteTexture) { gl.deleteTexture(this.paletteTexture); this.paletteTexture = null }
    this._imageSize             = { width: 0, height: 0 }
    this.pixelData              = null
    this.pixelDataWidth         = 0
    this.provinceIndex          = null
    this.paletteData            = null
    this.edgeMaskColor          = -1
    this.cachedEdgeMask         = null
    this.edgeMaskCentroid       = null
    this.edgeMaskProvincePixels = 0
    for (const entry of this.overlayEntries) this.gl.deleteTexture(entry.texture)
    this.overlayEntries = []
    if (this.edgeMaskTexture) { gl.deleteTexture(this.edgeMaskTexture); this.edgeMaskTexture = null }
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  // Reads the displayed RGBA color at a canvas-pixel coordinate via readPixels.
  // Returns null when the coordinate falls outside the rendered image (alpha = 0).
  readPixel(canvasX: number, canvasY: number): { r: number; g: number; b: number } | null {
    const { gl } = this
    const buf = new Uint8Array(4)
    const glY = gl.drawingBufferHeight - Math.floor(canvasY) - 1
    gl.readPixels(Math.floor(canvasX), glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf)
    if (buf[3] === 0) return null
    return { r: buf[0], g: buf[1], b: buf[2] }
  }

  // Reads the original province color at a canvas coordinate (bypasses colorMap).
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

  // Returns a cached edge mask for the given packed province color.
  // Delegates computation to provinceAnalysis; only one mask is kept at a time.
  computeEdgeMask(packedColor: number): OffscreenCanvas | null {
    if (this.edgeMaskColor === packedColor && this.cachedEdgeMask) {
      return this.cachedEdgeMask.canvas
    }
    const pixels = this.pixelData
    if (!pixels) return null

    const result = computeEdgeMask(
      { data: pixels, width: this.pixelDataWidth, height: this._imageSize.height },
      packedColor
    )
    this.cachedEdgeMask         = result
    this.edgeMaskColor          = packedColor
    this.edgeMaskProvincePixels = result.provincePixels
    this.edgeMaskCentroid       = result.centroid
    return result.canvas
  }

  // Remaps province display colors. Only updates the palette texture —
  // no map image re-upload. colorMap: packed province RGB → packed display RGB.
  recolorTexture(colorMap: Map<number, number>): void {
    const { gl } = this
    const index = this.provinceIndex
    const palette = this.paletteData
    if (!index || !palette || !this.paletteTexture) return

    for (const [provincePacked, displayPacked] of colorMap) {
      const id = index.colorToId.get(provincePacked)
      if (id === undefined) continue
      const base  = id * 4
      palette[base]     = (displayPacked >> 16) & 0xff
      palette[base + 1] = (displayPacked >>  8) & 0xff
      palette[base + 2] =  displayPacked        & 0xff
      palette[base + 3] = 0xff
    }

    gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, this.paletteHeight, gl.RGBA, gl.UNSIGNED_BYTE, palette)
  }

  // Reverts all palette entries to their original province colors.
  restoreOriginalTexture(): void {
    const { gl } = this
    const index = this.provinceIndex
    const palette = this.paletteData
    if (!index || !palette || !this.paletteTexture) return

    for (const [packed, id] of index.colorToId) {
      const base  = id * 4
      palette[base]     = (packed >> 16) & 0xff
      palette[base + 1] = (packed >>  8) & 0xff
      palette[base + 2] =  packed        & 0xff
      palette[base + 3] = 0xff
    }
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, this.paletteHeight, gl.RGBA, gl.UNSIGNED_BYTE, palette)
  }

  dispose(): void {
    const { gl } = this
    if (this.idTexture)      gl.deleteTexture(this.idTexture)
    if (this.paletteTexture) gl.deleteTexture(this.paletteTexture)
    for (const entry of this.overlayEntries) gl.deleteTexture(entry.texture)
    gl.deleteProgram(this.overlayProgram)
    gl.deleteBuffer(this.quadBuffer)
    gl.deleteProgram(this.program)
    if (this.edgeMaskTexture) gl.deleteTexture(this.edgeMaskTexture)
    this.disposeFbos()
    gl.deleteProgram(this.edgeBlitProgram)
    gl.deleteProgram(this.blurProgram)
    gl.deleteProgram(this.glowCompProgram)
  }

  private createFbo(w: number, h: number): { fbo: WebGLFramebuffer; tex: WebGLTexture } {
    const { gl } = this
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return { fbo, tex }
  }

  private disposeFbos(): void {
    const { gl } = this
    for (const entry of [this.edgeFBO, this.blurHFBO, this.blurVFBO]) {
      if (!entry) continue
      gl.deleteTexture(entry.tex)
      gl.deleteFramebuffer(entry.fbo)
    }
    this.edgeFBO = this.blurHFBO = this.blurVFBO = null
  }

  // Lazily creates or recreates FBO textures when the drawing buffer dimensions change.
  private ensureFbos(): void {
    const w = this.gl.drawingBufferWidth
    const h = this.gl.drawingBufferHeight
    if (this.fboWidth === w && this.fboHeight === h) return
    this.disposeFbos()
    this.fboWidth  = w
    this.fboHeight = h
    this.edgeFBO  = this.createFbo(w, h)
    this.blurHFBO = this.createFbo(w, h)
    this.blurVFBO = this.createFbo(w, h)
  }

  // Builds the column-major mat3 mapping [0,1]×[0,1] to clip space.
  // Pre-allocated Float32Array reused every call to avoid GC pressure.
  private buildMatrix(tx: number, ty: number, scale: number): Float32Array {
    const cw = this.gl.drawingBufferWidth
    const ch = this.gl.drawingBufferHeight
    const { width: iw, height: ih } = this._imageSize
    const m = this.matrixData
    m[0] =  iw * scale * 2 / cw; m[1] = 0;                    m[2] = 0
    m[3] = 0;                    m[4] = -(ih * scale * 2 / ch); m[5] = 0
    m[6] = tx * 2 / cw - 1;     m[7] = 1 - ty * 2 / ch;       m[8] = 1
    return m
  }
}
