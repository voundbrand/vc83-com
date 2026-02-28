#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");

const REQUIRED_SIZE = 1024;

const targets = [
  {
    label: "Expo icon",
    file: path.join(appRoot, "assets", "icon.png"),
  },
  {
    label: "iOS App Store icon",
    file: path.join(
      appRoot,
      "ios",
      "L4yercak3",
      "Images.xcassets",
      "AppIcon.appiconset",
      "App-Icon-1024x1024@1x.png"
    ),
  },
];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function parsePng(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("not a valid PNG file");
  }

  let offset = 8;
  let width = null;
  let height = null;
  let colorType = null;
  let hasTransparencyChunk = false;

  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const chunkType = buf.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcEnd = dataEnd + 4;

    if (crcEnd > buf.length) {
      throw new Error("truncated PNG chunk");
    }

    if (chunkType === "IHDR") {
      width = buf.readUInt32BE(dataStart);
      height = buf.readUInt32BE(dataStart + 4);
      colorType = buf.readUInt8(dataStart + 9);
    } else if (chunkType === "tRNS") {
      hasTransparencyChunk = true;
    } else if (chunkType === "IEND") {
      break;
    }

    offset = crcEnd;
  }

  if (width === null || height === null || colorType === null) {
    throw new Error("missing IHDR chunk");
  }

  const hasAlphaColorType = colorType === 4 || colorType === 6;
  const hasAlpha = hasAlphaColorType || hasTransparencyChunk;

  return { width, height, hasAlpha };
}

const failures = [];

for (const target of targets) {
  if (!fs.existsSync(target.file)) {
    failures.push(`${target.label}: missing file (${target.file})`);
    continue;
  }

  try {
    const metadata = parsePng(target.file);
    const sizeOk = metadata.width === REQUIRED_SIZE && metadata.height === REQUIRED_SIZE;
    const alphaOk = !metadata.hasAlpha;

    if (!sizeOk) {
      failures.push(
        `${target.label}: expected ${REQUIRED_SIZE}x${REQUIRED_SIZE}, got ${metadata.width}x${metadata.height}`
      );
    }

    if (!alphaOk) {
      failures.push(`${target.label}: PNG contains alpha/transparency data`);
    }
  } catch (error) {
    failures.push(`${target.label}: ${(error && error.message) || String(error)}`);
  }
}

if (failures.length > 0) {
  console.error("iOS icon preflight failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("iOS icon preflight passed: 1024x1024 icons with no alpha channel.");

