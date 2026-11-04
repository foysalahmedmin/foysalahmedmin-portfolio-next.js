/**
 * A one-time look at the graphics stack, for the 3D scene only (docs plan 6.3): is WebGL2 available,
 * and is it a software renderer (SwiftShader, llvmpipe)? A software renderer can draw the scene, but
 * only at a few frames a second, so those visitors get the poster. Creating a context is not free, so
 * nothing but the hero canvas calls this, and the result is cached for the page.
 */
export type GpuProbe = Readonly<{
  webgl2: boolean;
  software: boolean;
  renderer: string | null;
}>;

const SOFTWARE_RENDERER =
  /swiftshader|llvmpipe|softpipe|software|microsoft basic|mesa offscreen/i;

export const isSoftwareRenderer = (name: string | null | undefined): boolean =>
  Boolean(name) && SOFTWARE_RENDERER.test(name!);

let cached: GpuProbe | undefined;

export function probeGpu(): GpuProbe {
  if (cached) return cached;

  let result: GpuProbe = { webgl2: false, software: false, renderer: null };
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (gl) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = info
        ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
        : String(gl.getParameter(gl.RENDERER));
      result = {
        webgl2: true,
        software: isSoftwareRenderer(renderer),
        renderer,
      };
      // Give the context back at once; the scene creates its own
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    /* a blocked or failing context counts as no WebGL2 */
  }
  cached = result;
  return result;
}

/** Test seam: forget the cached probe. */
export const resetGpuProbeForTests = () => {
  cached = undefined;
};
