import { buildProvinceIndex } from './provinceAnalysis'
import type { ProvinceMapSource } from './ProvinceMapSource'
import type { ProvinceIndex } from './provinceAnalysis'

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

const OUTLINE_OVERLAY_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
uniform float u_opacity;
uniform vec4 u_color;
uniform vec2 u_poff;
in vec2 v_uv;
out vec4 fragColor;
vec4 sampleGroup(vec2 uv) {
  return texture(u_tex, clamp(uv, vec2(0.0), vec2(1.0)));
}
bool sameGroup(vec4 a, vec4 b) {
  return distance(a, b) < 0.002;
}
void main() {
  vec4 center = sampleGroup(v_uv);
  if (center.a <= 0.0) discard;
  if (sameGroup(center, sampleGroup(v_uv + vec2( u_poff.x, 0.0))) &&
      sameGroup(center, sampleGroup(v_uv + vec2(-u_poff.x, 0.0))) &&
      sameGroup(center, sampleGroup(v_uv + vec2(0.0,  u_poff.y))) &&
      sameGroup(center, sampleGroup(v_uv + vec2(0.0, -u_poff.y)))) discard;
  fragColor = vec4(u_color.rgb, u_opacity * u_color.a);
}
`

// Province outline: for each fragment, looks up whether the province at that UV
// is selected (via a dedicated selection texture, same 256-column layout as the
// palette). Checks 4 screen-pixel-offset neighbours; if any differ in selection
// state this is a border pixel → white (inverted by ONE_MINUS_DST_COLOR blend).
const FRAG_OUTLINE = `#version 300 es
precision highp float;
uniform sampler2D u_id_tex;
uniform sampler2D u_sel_tex;
uniform int u_sel_height;
uniform vec2 u_poff;
in vec2 v_uv;
out vec4 fragColor;
bool isSel(vec2 uv) {
  vec4 p = texture(u_id_tex, clamp(uv, vec2(0.0), vec2(1.0)));
  float pu = (p.r * 255.0 + 0.5) / 256.0;
  float pv = (p.g * 255.0 + 0.5) / float(u_sel_height);
  return texture(u_sel_tex, vec2(pu, pv)).r > 0.5;
}
void main() {
  bool c = isSel(v_uv);
  if (isSel(v_uv + vec2( u_poff.x, 0.0)) == c &&
      isSel(v_uv + vec2(-u_poff.x, 0.0)) == c &&
      isSel(v_uv + vec2(0.0,  u_poff.y)) == c &&
      isSel(v_uv + vec2(0.0, -u_poff.y)) == c) discard;
  fragColor = vec4(1.0);
}
`

const FRAG_OUTLINE_COLOR = `#version 300 es
precision highp float;
uniform sampler2D u_id_tex;
uniform sampler2D u_sel_tex;
uniform int u_sel_height;
uniform vec2 u_poff;
uniform vec4 u_color;
in vec2 v_uv;
out vec4 fragColor;
bool isSel(vec2 uv) {
  vec4 p = texture(u_id_tex, clamp(uv, vec2(0.0), vec2(1.0)));
  float pu = (p.r * 255.0 + 0.5) / 256.0;
  float pv = (p.g * 255.0 + 0.5) / float(u_sel_height);
  return texture(u_sel_tex, vec2(pu, pv)).r > 0.5;
}
void main() {
  bool c = isSel(v_uv);
  if (!c) discard;
  if (isSel(v_uv + vec2( u_poff.x, 0.0)) == c &&
      isSel(v_uv + vec2(-u_poff.x, 0.0)) == c &&
      isSel(v_uv + vec2(0.0,  u_poff.y)) == c &&
      isSel(v_uv + vec2(0.0, -u_poff.y)) == c) discard;
  fragColor = u_color;
}
`

// Bounding-box outline: vertices arrive pre-computed in NDC.
const VERT_NDC = `#version 300 es
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG_SOLID = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 fragColor;
void main() {
  fragColor = u_color;
}
`

interface ProvinceBboxGroup {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

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
  private readonly outlineOverlayProgram: WebGLProgram
  private readonly outlineOverlayPosLoc: number
  private readonly outlineOverlayMatrixLoc: WebGLUniformLocation
  private readonly outlineOverlayTexLoc: WebGLUniformLocation
  private readonly outlineOverlayOpacityLoc: WebGLUniformLocation
  private readonly outlineOverlayColorLoc: WebGLUniformLocation
  private readonly outlineOverlayPoffLoc: WebGLUniformLocation
  private outlineOverlayEntries: { id: string; texture: WebGLTexture; opacity: number; color: [number, number, number, number] }[] = []

  // --- Province outline pipeline ---
  private readonly outlineProgram: WebGLProgram
  private readonly outlinePosLoc: number
  private readonly outlineMatrixLoc: WebGLUniformLocation
  private readonly outlineIdTexLoc: WebGLUniformLocation
  private readonly outlineSelTexLoc: WebGLUniformLocation
  private readonly outlineSelHeightLoc: WebGLUniformLocation
  private readonly outlinePoffLoc: WebGLUniformLocation
  private readonly validationOutlineProgram: WebGLProgram
  private readonly validationOutlinePosLoc: number
  private readonly validationOutlineMatrixLoc: WebGLUniformLocation
  private readonly validationOutlineIdTexLoc: WebGLUniformLocation
  private readonly validationOutlineSelTexLoc: WebGLUniformLocation
  private readonly validationOutlineSelHeightLoc: WebGLUniformLocation
  private readonly validationOutlinePoffLoc: WebGLUniformLocation
  private readonly validationOutlineColorLoc: WebGLUniformLocation

  // Selection texture: 256×paletteHeight R8 (stored as RGBA8, R channel = 1 if selected).
  // Same UV indexing as the palette texture — cell (id%256, id/256) = 1 when id is selected.
  private selectionTexture: WebGLTexture | null = null
  private selectionData: Uint8Array | null = null  // CPU mirror for partial updates
  private selectionCount = 0
  private validationWarningTexture: WebGLTexture | null = null
  private validationWarningData: Uint8Array | null = null
  private validationWarningCount = 0
  private validationErrorTexture: WebGLTexture | null = null
  private validationErrorData: Uint8Array | null = null
  private validationErrorCount = 0

  // Bounding-box outline: 4 thin screen-space quads per contiguous selection group.
  private readonly bboxProgram: WebGLProgram
  private readonly bboxPosLoc: number
  private readonly bboxColorLoc: WebGLUniformLocation
  private readonly bboxDynBuffer: WebGLBuffer

  // Contiguous groups of the current selection; one bbox per group.
  private selectionBboxGroups: ProvinceBboxGroup[] = []
  private validationWarningBboxGroups: ProvinceBboxGroup[] = []
  private validationErrorBboxGroups: ProvinceBboxGroup[] = []

  // Public — read by MapCanvas for viewport centering (center of union of all selected bboxes).
  provinceCentroid: { x: number; y: number } | null = null

  // Pre-allocated; avoids GC pressure on every render call.
  private readonly matrixData = new Float32Array(9)

  private idTexture: WebGLTexture | null = null
  private paletteTexture: WebGLTexture | null = null
  // CPU-side pixel data — kept for readOriginalPixel.
  private pixelData: Uint8ClampedArray | null = null
  private pixelDataWidth = 0
  private provinceIndex: ProvinceIndex | null = null
  // Palette buffer reused across recolor calls. Sized to provinceCount + 1 (index 0 = unmapped).
  private paletteData: Uint8Array | null = null

  private _imageSize = { width: 0, height: 0 }

  get imageSize() { return this._imageSize }
  get index() { return this.provinceIndex }

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

    const outlineOverlayVert = compileShader(gl, gl.VERTEX_SHADER, VERT)
    const outlineOverlayFrag = compileShader(gl, gl.FRAGMENT_SHADER, OUTLINE_OVERLAY_FRAG)
    const outlineOverlayProgram = gl.createProgram()!
    gl.attachShader(outlineOverlayProgram, outlineOverlayVert)
    gl.attachShader(outlineOverlayProgram, outlineOverlayFrag)
    gl.linkProgram(outlineOverlayProgram)
    if (!gl.getProgramParameter(outlineOverlayProgram, gl.LINK_STATUS))
      throw new Error(`Outline overlay shader link error: ${gl.getProgramInfoLog(outlineOverlayProgram)}`)
    gl.deleteShader(outlineOverlayVert)
    gl.deleteShader(outlineOverlayFrag)
    this.outlineOverlayProgram = outlineOverlayProgram
    this.outlineOverlayPosLoc = gl.getAttribLocation(outlineOverlayProgram, 'a_pos')
    this.outlineOverlayMatrixLoc = gl.getUniformLocation(outlineOverlayProgram, 'u_matrix')!
    this.outlineOverlayTexLoc = gl.getUniformLocation(outlineOverlayProgram, 'u_tex')!
    this.outlineOverlayOpacityLoc = gl.getUniformLocation(outlineOverlayProgram, 'u_opacity')!
    this.outlineOverlayColorLoc = gl.getUniformLocation(outlineOverlayProgram, 'u_color')!
    this.outlineOverlayPoffLoc = gl.getUniformLocation(outlineOverlayProgram, 'u_poff')!

    // Province outline program: reuses VERT (map transform) + ID-texture neighbour check.
    const outlineVert = compileShader(gl, gl.VERTEX_SHADER, VERT)
    const outlineFrag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_OUTLINE)
    const outlineProg = gl.createProgram()!
    gl.attachShader(outlineProg, outlineVert)
    gl.attachShader(outlineProg, outlineFrag)
    gl.linkProgram(outlineProg)
    if (!gl.getProgramParameter(outlineProg, gl.LINK_STATUS))
      throw new Error(`Outline shader link error: ${gl.getProgramInfoLog(outlineProg)}`)
    gl.deleteShader(outlineVert)
    gl.deleteShader(outlineFrag)
    this.outlineProgram      = outlineProg
    this.outlinePosLoc       = gl.getAttribLocation(outlineProg, 'a_pos')
    this.outlineMatrixLoc    = gl.getUniformLocation(outlineProg, 'u_matrix')!
    this.outlineIdTexLoc     = gl.getUniformLocation(outlineProg, 'u_id_tex')!
    this.outlineSelTexLoc    = gl.getUniformLocation(outlineProg, 'u_sel_tex')!
    this.outlineSelHeightLoc = gl.getUniformLocation(outlineProg, 'u_sel_height')!
    this.outlinePoffLoc      = gl.getUniformLocation(outlineProg, 'u_poff')!

    const validationOutlineVert = compileShader(gl, gl.VERTEX_SHADER, VERT)
    const validationOutlineFrag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_OUTLINE_COLOR)
    const validationOutlineProg = gl.createProgram()!
    gl.attachShader(validationOutlineProg, validationOutlineVert)
    gl.attachShader(validationOutlineProg, validationOutlineFrag)
    gl.linkProgram(validationOutlineProg)
    if (!gl.getProgramParameter(validationOutlineProg, gl.LINK_STATUS))
      throw new Error(`Validation outline shader link error: ${gl.getProgramInfoLog(validationOutlineProg)}`)
    gl.deleteShader(validationOutlineVert)
    gl.deleteShader(validationOutlineFrag)
    this.validationOutlineProgram = validationOutlineProg
    this.validationOutlinePosLoc = gl.getAttribLocation(validationOutlineProg, 'a_pos')
    this.validationOutlineMatrixLoc = gl.getUniformLocation(validationOutlineProg, 'u_matrix')!
    this.validationOutlineIdTexLoc = gl.getUniformLocation(validationOutlineProg, 'u_id_tex')!
    this.validationOutlineSelTexLoc = gl.getUniformLocation(validationOutlineProg, 'u_sel_tex')!
    this.validationOutlineSelHeightLoc = gl.getUniformLocation(validationOutlineProg, 'u_sel_height')!
    this.validationOutlinePoffLoc = gl.getUniformLocation(validationOutlineProg, 'u_poff')!
    this.validationOutlineColorLoc = gl.getUniformLocation(validationOutlineProg, 'u_color')!

    // Bounding-box program: NDC positions + solid magenta.
    const bboxVert = compileShader(gl, gl.VERTEX_SHADER, VERT_NDC)
    const bboxFrag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SOLID)
    const bboxProg = gl.createProgram()!
    gl.attachShader(bboxProg, bboxVert)
    gl.attachShader(bboxProg, bboxFrag)
    gl.linkProgram(bboxProg)
    if (!gl.getProgramParameter(bboxProg, gl.LINK_STATUS))
      throw new Error(`BBox shader link error: ${gl.getProgramInfoLog(bboxProg)}`)
    gl.deleteShader(bboxVert)
    gl.deleteShader(bboxFrag)
    this.bboxProgram = bboxProg
    this.bboxPosLoc  = gl.getAttribLocation(bboxProg, 'a_pos')
    this.bboxColorLoc = gl.getUniformLocation(bboxProg, 'u_color')!
    this.bboxDynBuffer = gl.createBuffer()!
  }

  async loadImage(source: ProvinceMapSource): Promise<void> {
    const { gl } = this
    const { width, height, pixelData, imageBitmap } = source

    this._imageSize     = { width, height }
    this.pixelData      = pixelData
    this.pixelDataWidth = width
    this.provinceCentroid = null

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

    void imageBitmap

    // Selection texture — same 256×paletteHeight layout as palette.
    // R channel = 1.0 (255) for selected province IDs, 0 otherwise.
    // Starts fully cleared; updated by setHighlightColors.
    if (this.selectionTexture) gl.deleteTexture(this.selectionTexture)
    this.selectionData = new Uint8Array(256 * paletteHeight * 4)
    this.selectionTexture = gl.createTexture()!
    initializeMaskTexture(gl, this.selectionTexture, this.selectionData, paletteHeight)
    this.selectionCount = 0

    if (this.validationWarningTexture) gl.deleteTexture(this.validationWarningTexture)
    this.validationWarningData = new Uint8Array(256 * paletteHeight * 4)
    this.validationWarningTexture = gl.createTexture()!
    initializeMaskTexture(gl, this.validationWarningTexture, this.validationWarningData, paletteHeight)
    this.validationWarningCount = 0

    if (this.validationErrorTexture) gl.deleteTexture(this.validationErrorTexture)
    this.validationErrorData = new Uint8Array(256 * paletteHeight * 4)
    this.validationErrorTexture = gl.createTexture()!
    initializeMaskTexture(gl, this.validationErrorTexture, this.validationErrorData, paletteHeight)
    this.validationErrorCount = 0

    this.selectionBboxGroups = []
    this.validationWarningBboxGroups = []
    this.validationErrorBboxGroups = []
    this.provinceCentroid = null
  }

  setOverlayTextures(input: {
    bitmapEntries: { id: string; source: ImageBitmap | OffscreenCanvas; opacity: number }[]
    outlineEntries: { id: string; source: ImageBitmap | OffscreenCanvas; opacity: number; color: [number, number, number, number] }[]
  }): void {
    const { gl } = this
    // Delete all existing overlay textures before uploading new set.
    for (const entry of this.overlayEntries) gl.deleteTexture(entry.texture)
    for (const entry of this.outlineOverlayEntries) gl.deleteTexture(entry.texture)
    this.overlayEntries = []
    this.outlineOverlayEntries = []

    for (const e of input.bitmapEntries) {
      const texture = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, e.source)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      this.overlayEntries.push({ id: e.id, texture, opacity: e.opacity })
    }

    for (const e of input.outlineEntries) {
      const texture = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, e.source)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      this.outlineOverlayEntries.push({ id: e.id, texture, opacity: e.opacity, color: e.color })
    }
  }

  // Updates the multi-selection mask texture only.
  setHighlightColors(packedColors: number[]): void {
    const { gl } = this
    const index = this.provinceIndex
    const sel = this.selectionData
    if (!index || !sel || !this.selectionTexture) return

    // Clear existing selection bits.
    sel.fill(0)

    // Resolve packed colors → sequential IDs; mark selected in texture data.
    const selectedIds = new Set<number>()
    for (const packed of packedColors) {
      const id = index.colorToId.get(packed)
      if (id === undefined) continue
      selectedIds.add(id)
      sel[id * 4] = 255  // R channel = selected
    }
    this.selectionCount = selectedIds.size

    gl.bindTexture(gl.TEXTURE_2D, this.selectionTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, this.paletteHeight, gl.RGBA, gl.UNSIGNED_BYTE, sel)

  }

  setSelectionStructure(input: {
    bboxGroups: ProvinceBboxGroup[]
    centroid: { x: number; y: number } | null
  }): void {
    this.selectionBboxGroups = input.bboxGroups
    this.provinceCentroid = input.centroid
  }

  setValidationHighlightColors(input: { warningColors: number[]; errorColors: number[] }): void {
    this.validationWarningCount = this.updateHighlightTexture(this.validationWarningTexture, this.validationWarningData, input.warningColors)
    this.validationErrorCount = this.updateHighlightTexture(this.validationErrorTexture, this.validationErrorData, input.errorColors)
  }

  setValidationStructure(input: {
    warningBboxGroups: ProvinceBboxGroup[]
    errorBboxGroups: ProvinceBboxGroup[]
  }): void {
    this.validationWarningBboxGroups = input.warningBboxGroups
    this.validationErrorBboxGroups = input.errorBboxGroups
  }

  render(tx: number, ty: number, scale: number): void {
    const { gl } = this
    if (!this.idTexture || !this.paletteTexture || this._imageSize.width === 0) return

    const matrix = this.buildMatrix(tx, ty, scale)
    const w = gl.drawingBufferWidth
    const h = gl.drawingBufferHeight

    gl.viewport(0, 0, w, h)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // --- Base map ---
    gl.useProgram(this.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.enableVertexAttribArray(this.posLoc)
    gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0)
    gl.uniformMatrix3fv(this.matrixLoc, false, matrix)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.idTexture)
    gl.uniform1i(this.idTexLoc, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture)
    gl.uniform1i(this.paletteTexLoc, 1)
    gl.uniform1i(this.paletteHeightLoc, this.paletteHeight)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // --- Overlays ---
    if (this.overlayEntries.length > 0) {
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(this.overlayProgram)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
      gl.enableVertexAttribArray(this.overlayPosLoc)
      gl.vertexAttribPointer(this.overlayPosLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniformMatrix3fv(this.overlayMatrixLoc, false, matrix)
      gl.uniform1i(this.overlayTexLoc, 0)
      gl.activeTexture(gl.TEXTURE0)
      for (const entry of this.overlayEntries) {
        gl.bindTexture(gl.TEXTURE_2D, entry.texture)
        gl.uniform1f(this.overlayOpacityLoc, entry.opacity)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      }
      gl.disable(gl.BLEND)
    }

    if (this.outlineOverlayEntries.length > 0) {
      const { width: iw, height: ih } = this._imageSize
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(this.outlineOverlayProgram)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
      gl.enableVertexAttribArray(this.outlineOverlayPosLoc)
      gl.vertexAttribPointer(this.outlineOverlayPosLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniformMatrix3fv(this.outlineOverlayMatrixLoc, false, matrix)
      gl.uniform1i(this.outlineOverlayTexLoc, 0)
      gl.uniform2f(this.outlineOverlayPoffLoc, 1 / iw, 1 / ih)
      gl.activeTexture(gl.TEXTURE0)
      for (const entry of this.outlineOverlayEntries) {
        gl.bindTexture(gl.TEXTURE_2D, entry.texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.uniform1f(this.outlineOverlayOpacityLoc, entry.opacity)
        gl.uniform4f(this.outlineOverlayColorLoc, entry.color[0], entry.color[1], entry.color[2], entry.color[3])
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      }
      gl.disable(gl.BLEND)
    }

    // --- Validation outlines ---
    if ((this.validationWarningCount > 0 && this.validationWarningTexture) || (this.validationErrorCount > 0 && this.validationErrorTexture)) {
      const { width: iw, height: ih } = this._imageSize
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

      if (this.validationWarningCount > 0 && this.validationWarningTexture) {
        this.renderValidationOutline(this.validationWarningTexture, matrix, iw, ih, scale, [0.95, 0.78, 0.16, 1.0])
        this.renderBboxGroups(this.validationWarningBboxGroups, tx, ty, scale, w, h, [0.95, 0.78, 0.16, 1.0])
      }
      if (this.validationErrorCount > 0 && this.validationErrorTexture) {
        this.renderValidationOutline(this.validationErrorTexture, matrix, iw, ih, scale, [0.91, 0.25, 0.21, 1.0])
        this.renderBboxGroups(this.validationErrorBboxGroups, tx, ty, scale, w, h, [0.91, 0.25, 0.21, 1.0])
      }
      gl.disable(gl.BLEND)
    }

    // --- Province outline + bounding boxes ---
    if (this.selectionBboxGroups.length > 0 && this.selectionTexture) {
      const { width: iw, height: ih } = this._imageSize
      // ONE_MINUS_DST_COLOR: white fragments invert the destination exactly.
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ZERO)

      // Outline: single draw over the map quad; selection texture gives O(1) per-fragment lookup.
      gl.useProgram(this.outlineProgram)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
      gl.enableVertexAttribArray(this.outlinePosLoc)
      gl.vertexAttribPointer(this.outlinePosLoc, 2, gl.FLOAT, false, 0, 0)
      gl.uniformMatrix3fv(this.outlineMatrixLoc, false, matrix)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.idTexture)
      gl.uniform1i(this.outlineIdTexLoc, 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, this.selectionTexture)
      gl.uniform1i(this.outlineSelTexLoc, 1)
      gl.uniform1i(this.outlineSelHeightLoc, this.paletteHeight)
      gl.uniform2f(this.outlinePoffLoc, 1 / (iw * scale), 1 / (ih * scale))
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      // Bounding-box: one rect per contiguous selection group.
      this.renderBboxGroups(this.selectionBboxGroups, tx, ty, scale, w, h, [1, 1, 1, 1])

      gl.disable(gl.BLEND)
    }

    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  clearImage(): void {
    const { gl } = this
    if (this.idTexture)       { gl.deleteTexture(this.idTexture);       this.idTexture = null }
    if (this.paletteTexture)  { gl.deleteTexture(this.paletteTexture);  this.paletteTexture = null }
    if (this.selectionTexture){ gl.deleteTexture(this.selectionTexture); this.selectionTexture = null }
    if (this.validationWarningTexture) { gl.deleteTexture(this.validationWarningTexture); this.validationWarningTexture = null }
    if (this.validationErrorTexture) { gl.deleteTexture(this.validationErrorTexture); this.validationErrorTexture = null }
    this._imageSize         = { width: 0, height: 0 }
    this.pixelData          = null
    this.pixelDataWidth     = 0
    this.provinceIndex      = null
    this.paletteData        = null
    this.selectionData      = null
    this.selectionCount     = 0
    this.validationWarningData = null
    this.validationWarningCount = 0
    this.validationErrorData = null
    this.validationErrorCount = 0
    this.selectionBboxGroups = []
    this.validationWarningBboxGroups = []
    this.validationErrorBboxGroups = []
    this.provinceCentroid   = null
    for (const entry of this.overlayEntries) this.gl.deleteTexture(entry.texture)
    for (const entry of this.outlineOverlayEntries) this.gl.deleteTexture(entry.texture)
    this.overlayEntries = []
    this.outlineOverlayEntries = []
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
    if (this.idTexture)        gl.deleteTexture(this.idTexture)
    if (this.paletteTexture)   gl.deleteTexture(this.paletteTexture)
    if (this.selectionTexture) gl.deleteTexture(this.selectionTexture)
    if (this.validationWarningTexture) gl.deleteTexture(this.validationWarningTexture)
    if (this.validationErrorTexture) gl.deleteTexture(this.validationErrorTexture)
    for (const entry of this.overlayEntries) gl.deleteTexture(entry.texture)
    for (const entry of this.outlineOverlayEntries) gl.deleteTexture(entry.texture)
    gl.deleteBuffer(this.quadBuffer)
    gl.deleteBuffer(this.bboxDynBuffer)
    gl.deleteProgram(this.program)
    gl.deleteProgram(this.overlayProgram)
    gl.deleteProgram(this.outlineOverlayProgram)
    gl.deleteProgram(this.outlineProgram)
    gl.deleteProgram(this.validationOutlineProgram)
    gl.deleteProgram(this.bboxProgram)
  }

  private updateHighlightTexture(
    texture: WebGLTexture | null,
    data: Uint8Array | null,
    packedColors: number[]
  ): number {
    const index = this.provinceIndex
    if (!index || !data || !texture) return 0

    data.fill(0)
    let count = 0
    for (const packed of packedColors) {
      const id = index.colorToId.get(packed)
      if (id === undefined) continue
      if (data[id * 4] === 255) continue
      data[id * 4] = 255
      count += 1
    }

    const { gl } = this
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, this.paletteHeight, gl.RGBA, gl.UNSIGNED_BYTE, data)
    return count
  }

  private renderValidationOutline(
    texture: WebGLTexture,
    matrix: Float32Array,
    imageWidth: number,
    imageHeight: number,
    scale: number,
    color: [number, number, number, number]
  ): void {
    const { gl } = this
    gl.useProgram(this.validationOutlineProgram)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.enableVertexAttribArray(this.validationOutlinePosLoc)
    gl.vertexAttribPointer(this.validationOutlinePosLoc, 2, gl.FLOAT, false, 0, 0)
    gl.uniformMatrix3fv(this.validationOutlineMatrixLoc, false, matrix)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.idTexture)
    gl.uniform1i(this.validationOutlineIdTexLoc, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(this.validationOutlineSelTexLoc, 1)
    gl.uniform1i(this.validationOutlineSelHeightLoc, this.paletteHeight)
    gl.uniform2f(this.validationOutlinePoffLoc, 1 / (imageWidth * scale), 1 / (imageHeight * scale))
    gl.uniform4f(this.validationOutlineColorLoc, color[0], color[1], color[2], color[3])
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  private renderBboxGroups(
    groups: ProvinceBboxGroup[],
    tx: number,
    ty: number,
    scale: number,
    canvasWidth: number,
    canvasHeight: number,
    color: [number, number, number, number]
  ): void {
    if (groups.length === 0) return

    const { gl } = this
    gl.useProgram(this.bboxProgram)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bboxDynBuffer)
    gl.enableVertexAttribArray(this.bboxPosLoc)
    gl.uniform4f(this.bboxColorLoc, color[0], color[1], color[2], color[3])

    for (const bbox of groups) {
      const verts = this.buildBboxVerts(bbox, tx, ty, scale, canvasWidth, canvasHeight)
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW)
      gl.vertexAttribPointer(this.bboxPosLoc, 2, gl.FLOAT, false, 0, 0)
      gl.drawArrays(gl.TRIANGLES, 0, verts.length / 2)
    }
  }

  // Builds 4 thin screen-space quads (1px thick) for a bounding-box outline in NDC.
  private buildBboxVerts(
    b: { minX: number; minY: number; maxX: number; maxY: number },
    tx: number, ty: number, scale: number, cw: number, ch: number
  ): Float32Array {
    // Map bbox pixel corners to screen space (+1 pixel outset to clear the image edge).
    const sx0 = b.minX * scale + tx - 1
    const sy0 = b.minY * scale + ty - 1
    const sx1 = (b.maxX + 1) * scale + tx + 1
    const sy1 = (b.maxY + 1) * scale + ty + 1
    // Screen → NDC: x: [0,cw]→[-1,1], y: [0,ch]→[1,-1] (WebGL Y is up).
    const nx0 = sx0 / cw * 2 - 1, nx1 = sx1 / cw * 2 - 1
    const ny0 = 1 - sy0 / ch * 2, ny1 = 1 - sy1 / ch * 2
    // 1px thickness in NDC.
    const tx2 = 2 / cw, ty2 = 2 / ch
    // 4 edges as 2 triangles each (24 vertices × 2 components = 48 floats).
    return new Float32Array([
      // Top
      nx0, ny0,       nx1, ny0,       nx0, ny0 - ty2,
      nx1, ny0,       nx1, ny0 - ty2, nx0, ny0 - ty2,
      // Bottom
      nx0, ny1 + ty2, nx1, ny1 + ty2, nx0, ny1,
      nx1, ny1 + ty2, nx1, ny1,       nx0, ny1,
      // Left (between inner top/bottom)
      nx0, ny0 - ty2, nx0 + tx2, ny0 - ty2, nx0, ny1 + ty2,
      nx0 + tx2, ny0 - ty2, nx0 + tx2, ny1 + ty2, nx0, ny1 + ty2,
      // Right
      nx1 - tx2, ny0 - ty2, nx1, ny0 - ty2, nx1 - tx2, ny1 + ty2,
      nx1, ny0 - ty2, nx1, ny1 + ty2, nx1 - tx2, ny1 + ty2,
    ])
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

function initializeMaskTexture(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  data: Uint8Array,
  paletteHeight: number
): void {
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, paletteHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
}
