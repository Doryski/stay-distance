import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"
import sharp from "sharp"

const root = path.resolve(fileURLToPath(import.meta.url), "../..")
const iconsDir = path.join(root, "public/icons")

const sizes = [16, 32, 48, 128] as const

const targets = [
  { master: "icon.svg", simplified: "icon-16.svg", suffix: "" },
  { master: "icon-dark.svg", simplified: "icon-16-dark.svg", suffix: "-dark" },
] as const

const rasterise = async (svgPath: string, outPath: string, size: number) => {
  const svg = await readFile(svgPath)
  const png = await sharp(svg, { density: 512 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
  await writeFile(outPath, png)
  console.log(`  → ${path.relative(root, outPath)}`)
}

const main = async () => {
  for (const { master, simplified, suffix } of targets) {
    console.log(`Rasterising ${master}${suffix ? ` (${suffix})` : ""}`)
    for (const size of sizes) {
      const source = size <= 16 ? simplified : master
      const out = path.join(iconsDir, `icon-${size}${suffix}.png`)
      await rasterise(path.join(iconsDir, source), out, size)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
