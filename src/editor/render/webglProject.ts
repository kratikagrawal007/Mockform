import { cornerBounds, type ProjectedCorner } from "./perspective";

/* Projects a flat image onto a tilted quad with WebGL2. One context is shared
   by the editor and the exporter. Without WebGL2 callers fall back to flat. */

const VERT = `#version 300 es
in vec4 a_pos;
in vec2 a_uv;
out vec2 v_uv;
void main() { v_uv = a_uv; gl_Position = a_pos; }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
out vec4 color;
void main() { color = texture(u_tex, v_uv); }`;

interface GL {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  buffer: WebGLBuffer;
  texture: WebGLTexture;
  maxSize: number;
}

let state: GL | null | undefined;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

function init(): GL | null {
  if (typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", {
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      antialias: true,
    });
    if (!gl) return null;
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const pos = gl.getAttribLocation(program, "a_pos");
    const uv = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 4, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 24, 16);

    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    if (aniso) {
      const max = gl.getParameter(
        aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT,
      ) as number;
      gl.texParameterf(
        gl.TEXTURE_2D,
        aniso.TEXTURE_MAX_ANISOTROPY_EXT,
        Math.min(8, max),
      );
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const maxSize = Math.min(
      gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
      8192,
    );
    return { canvas, gl, buffer, texture, maxSize };
  } catch {
    return null;
  }
}

function get(): GL | null {
  if (state === undefined) state = init();
  return state;
}

export function webglAvailable() {
  return get() !== null;
}

/** Largest flat image (per side) the projector accepts. */
export function maxTextureSize() {
  return get()?.maxSize ?? 0;
}

/**
 * Draws `source` onto the projected quad. Corners are in output pixels,
 * relative to the device centre. Returns the canvas holding the result and
 * where its top-left sits, or null if WebGL2 is unavailable.
 */
export function projectImage(
  source: TexImageSource,
  corners: ProjectedCorner[],
): {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  const s = get();
  if (!s) return null;
  const { gl, canvas } = s;
  const b = cornerBounds(corners);
  const width = Math.max(1, Math.ceil(b.width));
  const height = Math.max(1, Math.ceil(b.height));
  if (width > s.maxSize * 2 || height > s.maxSize * 2) return null;
  canvas.width = width;
  canvas.height = height;
  gl.viewport(0, 0, width, height);

  gl.bindTexture(gl.TEXTURE_2D, s.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.generateMipmap(gl.TEXTURE_2D);

  const uvs = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  const data = new Float32Array(
    corners.flatMap((c, i) => {
      // Clip space, multiplied by w so the GPU interpolates texture coordinates with perspective.
      const nx = ((c.x - b.minX) / width) * 2 - 1;
      const ny = 1 - ((c.y - b.minY) / height) * 2;
      return [nx * c.w, ny * c.w, 0, c.w, uvs[i][0], uvs[i][1]];
    }),
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, s.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return { canvas, x: b.minX, y: b.minY, width, height };
}
