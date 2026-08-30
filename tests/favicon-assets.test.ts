import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDirectory = path.resolve(process.cwd(), "public");

function pngMetadata(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(new TextDecoder("ascii").decode(bytes.subarray(1, 4))).toBe("PNG");
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    colorType: view.getUint8(25),
  };
}

describe("ClearTag favicon assets", () => {
  it("keeps the SVG mark simple, self-contained, and high contrast", async () => {
    const svg = await readFile(
      path.join(publicDirectory, "cleartag-mark-v2.svg"),
      "utf8",
    );

    expect(svg).toContain('viewBox="0 0 32 32"');
    expect(svg).toContain('fill="#102421"');
    expect(svg).toContain('fill="#FBFAF6"');
    expect(svg).not.toMatch(/<script|<filter|href=/i);
    expect((svg.match(/<path\b/g) ?? []).length).toBe(1);
  });

  it("ships exact PNG sizes and an opaque Apple touch icon", async () => {
    const icon16 = pngMetadata(
      await readFile(path.join(publicDirectory, "favicon-16-v2.png")),
    );
    const icon32 = pngMetadata(
      await readFile(path.join(publicDirectory, "favicon-32-v2.png")),
    );
    const apple = pngMetadata(
      await readFile(path.join(publicDirectory, "apple-touch-icon-v2.png")),
    );

    expect(icon16).toMatchObject({ width: 16, height: 16 });
    expect(icon32).toMatchObject({ width: 32, height: 32 });
    expect(apple).toEqual({ width: 180, height: 180, colorType: 2 });
  });

  it("ships a real multi-frame ICO fallback", async () => {
    const icon = await readFile(path.join(publicDirectory, "favicon.ico"));
    const view = new DataView(icon.buffer, icon.byteOffset, icon.byteLength);
    const count = view.getUint16(4, true);
    const sizes = Array.from({ length: count }, (_, index) => {
      const offset = 6 + index * 16;
      return [icon[offset] || 256, icon[offset + 1] || 256];
    });

    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
    expect(count).toBe(3);
    expect(sizes).toEqual([
      [16, 16],
      [32, 32],
      [48, 48],
    ]);
  });
});
