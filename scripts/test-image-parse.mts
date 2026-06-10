import {
  buildImageNodeAttrs,
  resolveImagePath,
  toDisplayImageSrc,
} from "../src/lib/imageSrc.ts";

const docPath = "E:\\Dev\\AI\\MD\\test.md";

console.log("resolve ./photo.png:", resolveImagePath("./photo.png", docPath));
console.log(
  "buildImageNodeAttrs relative:",
  buildImageNodeAttrs("./photo.png", docPath),
);
console.log(
  "buildImageNodeAttrs absolute same dir:",
  buildImageNodeAttrs("E:\\Dev\\AI\\MD\\photo.png", docPath),
);
console.log(
  "buildImageNodeAttrs nested:",
  buildImageNodeAttrs("./images/photo.png", docPath),
);
console.log(
  "toDisplay without doc (relative):",
  toDisplayImageSrc("./photo.png", null),
);
console.log(
  "toDisplay without doc (absolute):",
  toDisplayImageSrc("E:\\Dev\\AI\\MD\\photo.png", null),
);

const relativeAttrs = buildImageNodeAttrs("./photo.png", docPath);
if (relativeAttrs.src.includes("/./") || relativeAttrs.src.includes("\\.\\")) {
  console.error("FAIL: display src still contains /.\\ segment:", relativeAttrs.src);
  process.exit(1);
}

if (relativeAttrs.markdownSrc !== "./photo.png" && relativeAttrs.markdownSrc !== "photo.png") {
  console.error("FAIL: unexpected markdownSrc:", relativeAttrs.markdownSrc);
  process.exit(1);
}

const absoluteAttrs = buildImageNodeAttrs("E:\\Dev\\AI\\MD\\photo.png", docPath);
if (absoluteAttrs.markdownSrc.includes(":")) {
  console.error("FAIL: absolute path not relativized:", absoluteAttrs.markdownSrc);
  process.exit(1);
}

console.log("OK: image path helpers");
