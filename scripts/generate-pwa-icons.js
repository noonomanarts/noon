#!/usr/bin/env node
/**
 * Generate the full Noon PWA icon + Apple splash screen set from
 * `public/noon.png`.
 *
 * Output:
 *   public/icons/icon-{16,32,48,72,96,128,144,152,167,180,192,256,384,512,1024}.png
 *   public/icons/icon-{192,512}-maskable.png
 *   public/icons/apple-touch-icon.png                 (180x180)
 *   public/apple-touch-icon.png                       (root shortcut)
 *   public/favicon.ico                                (16 / 32 / 48 multi)
 *   public/icon-192x192.png, icon-256x256.png, icon-512x512.png (kept for compat)
 *   public/icons/splash/apple-splash-{w}x{h}.png      (all common iPhone + iPad)
 */

const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const sharp = require("sharp");
const pngToIco = require("png-to-ico").default || require("png-to-ico");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "public", "noon.png");
const PUBLIC_DIR = path.join(ROOT, "public");
const ICONS_DIR = path.join(PUBLIC_DIR, "icons");
const SPLASH_DIR = path.join(ICONS_DIR, "splash");

// Brand: the logo's purple background (sampled from noon.png).
const BRAND_BG = { r: 0x5b, g: 0x2f, b: 0x6b, alpha: 1 }; // Noon purple
const BRAND_BG_HEX = "#5b2f6b";

// Full-bleed "any" sizes — the logo already has padding built-in.
const ANY_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024];
// Maskable sizes — logo is resized to 80 % inside a solid brand background.
const MASKABLE_SIZES = [192, 512];

// Full Apple splash-screen matrix (pt × scale = physical px).
// Covers iPhone SE → iPhone 16 Pro Max and all common iPads.
const APPLE_SPLASH = [
  // iPhone 16 Pro Max / 15 Pro Max / 14 Pro Max
  { w: 1290, h: 2796, dw: 430, dh: 932, ratio: 3 },
  // iPhone 16 Pro / 15 Pro / 14 Pro
  { w: 1179, h: 2556, dw: 393, dh: 852, ratio: 3 },
  // iPhone 14 Plus / 13 Pro Max / 12 Pro Max
  { w: 1284, h: 2778, dw: 428, dh: 926, ratio: 3 },
  // iPhone 14 / 13 / 13 Pro / 12 / 12 Pro
  { w: 1170, h: 2532, dw: 390, dh: 844, ratio: 3 },
  // iPhone 13 mini / 12 mini / 11 Pro / XS / X
  { w: 1125, h: 2436, dw: 375, dh: 812, ratio: 3 },
  // iPhone 11 Pro Max / XS Max
  { w: 1242, h: 2688, dw: 414, dh: 896, ratio: 3 },
  // iPhone 11 / XR
  { w: 828, h: 1792, dw: 414, dh: 896, ratio: 2 },
  // iPhone 8 Plus / 7 Plus / 6s Plus / 6 Plus
  { w: 1242, h: 2208, dw: 414, dh: 736, ratio: 3 },
  // iPhone 8 / 7 / 6s / 6 / SE (2nd/3rd)
  { w: 750, h: 1334, dw: 375, dh: 667, ratio: 2 },
  // iPhone SE (1st gen) / iPod touch
  { w: 640, h: 1136, dw: 320, dh: 568, ratio: 2 },

  // iPad Pro 12.9"
  { w: 2048, h: 2732, dw: 1024, dh: 1366, ratio: 2 },
  // iPad Pro 11" / iPad Air (M2/M1) 11"
  { w: 1668, h: 2388, dw: 834, dh: 1194, ratio: 2 },
  // iPad Pro 10.5" / iPad Air 3
  { w: 1668, h: 2224, dw: 834, dh: 1112, ratio: 2 },
  // iPad 10.2" / iPad 9/8/7
  { w: 1620, h: 2160, dw: 810, dh: 1080, ratio: 2 },
  // iPad mini 8.3" / iPad 9.7"
  { w: 1536, h: 2048, dw: 768, dh: 1024, ratio: 2 },
];

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

async function generateAny() {
  const results = [];
  for (const size of ANY_SIZES) {
    const out = path.join(ICONS_DIR, `icon-${size}.png`);
    await sharp(SRC)
      .resize(size, size, { fit: "cover", withoutEnlargement: false })
      .png({ compressionLevel: 9, palette: false })
      .toFile(out);
    results.push({ size, out });
  }
  return results;
}

async function generateMaskable() {
  const results = [];
  for (const size of MASKABLE_SIZES) {
    // Safe zone = 80 % — so logo occupies 0.8 × size, centered, on solid bg.
    const inner = Math.round(size * 0.78);
    const logo = await sharp(SRC)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const bg = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BRAND_BG,
      },
    });

    const out = path.join(ICONS_DIR, `icon-${size}-maskable.png`);
    await bg
      .composite([{ input: logo, gravity: "center" }])
      .png({ compressionLevel: 9 })
      .toFile(out);
    results.push({ size, out });
  }
  return results;
}

async function generateAppleTouch() {
  const targets = [
    path.join(ICONS_DIR, "apple-touch-icon.png"),
    path.join(PUBLIC_DIR, "apple-touch-icon.png"),
  ];
  for (const out of targets) {
    await sharp(SRC)
      .resize(180, 180, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toFile(out);
  }
}

async function generateFavicon() {
  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map((s) =>
      sharp(SRC)
        .resize(s, s, { fit: "cover" })
        .png({ compressionLevel: 9 })
        .toBuffer()
    )
  );
  const ico = await pngToIco(pngBuffers);
  await fsp.writeFile(path.join(PUBLIC_DIR, "favicon.ico"), ico);
}

async function generateLegacyRootIcons() {
  // Keep root-level icons for compatibility with any deep-linked references.
  const sizes = [192, 256, 512];
  for (const size of sizes) {
    await sharp(SRC)
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toFile(path.join(PUBLIC_DIR, `icon-${size}x${size}.png`));
  }
}

async function generateSplash() {
  // Logo footprint is the smaller device dimension × 0.45, capped so iPads don't
  // render the logo gigantic.
  for (const s of APPLE_SPLASH) {
    for (const orientation of ["portrait", "landscape"]) {
      const w = orientation === "portrait" ? s.w : s.h;
      const h = orientation === "portrait" ? s.h : s.w;
      const logoSize = Math.round(Math.min(w, h) * 0.42);

      const logoBuf = await sharp(SRC)
        .resize(logoSize, logoSize, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      const canvas = sharp({
        create: {
          width: w,
          height: h,
          channels: 4,
          background: BRAND_BG,
        },
      });

      const out = path.join(
        SPLASH_DIR,
        `apple-splash-${w}x${h}.png`
      );
      await canvas
        .composite([{ input: logoBuf, gravity: "center" }])
        .png({ compressionLevel: 9 })
        .toFile(out);
    }
  }
}

async function writeSplashManifestJson(entries) {
  // Emit a small JSON file with the { device-width, device-height, ratio,
  // orientation, href } tuples so the layout can render <link> tags without
  // hard-coding them twice.
  const rows = [];
  for (const s of APPLE_SPLASH) {
    for (const orientation of ["portrait", "landscape"]) {
      const w = orientation === "portrait" ? s.w : s.h;
      const h = orientation === "portrait" ? s.h : s.w;
      const dw = orientation === "portrait" ? s.dw : s.dh;
      const dh = orientation === "portrait" ? s.dh : s.dw;
      rows.push({
        href: `/icons/splash/apple-splash-${w}x${h}.png`,
        deviceWidth: dw,
        deviceHeight: dh,
        ratio: s.ratio,
        orientation,
      });
    }
  }
  await fsp.writeFile(
    path.join(ICONS_DIR, "apple-splash.json"),
    JSON.stringify(rows, null, 2) + "\n",
    "utf8"
  );
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Source logo missing: ${SRC}`);
    process.exit(1);
  }
  await ensureDir(ICONS_DIR);
  await ensureDir(SPLASH_DIR);

  console.log(`→ Source: ${path.relative(ROOT, SRC)}`);
  console.log(`→ Brand background: ${BRAND_BG_HEX}`);

  await generateAny();
  console.log(`✓ any icons: ${ANY_SIZES.length} files`);

  await generateMaskable();
  console.log(`✓ maskable icons: ${MASKABLE_SIZES.length} files`);

  await generateAppleTouch();
  console.log("✓ apple-touch-icon (180×180)");

  await generateFavicon();
  console.log("✓ favicon.ico (16 / 32 / 48)");

  await generateLegacyRootIcons();
  console.log("✓ root compat: icon-192x192 / 256x256 / 512x512");

  await generateSplash();
  await writeSplashManifestJson();
  console.log(
    `✓ apple splash: ${APPLE_SPLASH.length * 2} files (portrait + landscape)`
  );

  console.log("\nAll icons generated successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
