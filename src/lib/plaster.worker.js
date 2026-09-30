/*
 * Paints plaster surfaces off the main thread.
 * Replies with a JPEG blob for CSS backgrounds and, when asked, bottom-up RGBA
 * buffers ready to upload as WebGL textures.
 */
import { makePlasterData } from './plaster.js';

function flipRows(src, w, h) {
  const out = new Uint8Array(src.length);
  const row = w * 4;
  for (let y = 0; y < h; y++) out.set(src.subarray(y * row, (y + 1) * row), (h - 1 - y) * row);
  return out;
}

self.onmessage = async (ev) => {
  const { id, opts, gl } = ev.data;
  try {
    const { w, h, rgba, normal } = makePlasterData(opts);
    const canvas = new OffscreenCanvas(w, h);
    canvas.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.84 });
    const out = { w, h, blob };
    const transfer = [];
    if (gl) {
      out.albedo = flipRows(rgba, w, h);
      transfer.push(out.albedo.buffer);
      if (normal) {
        out.normal = flipRows(normal, w, h);
        transfer.push(out.normal.buffer);
      }
    }
    self.postMessage({ id, out }, transfer);
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message) });
  }
};
