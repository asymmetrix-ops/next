// Light and dark values for Tailwind's palette, dark follows the CMS dark theme
const colors = require("tailwindcss/colors");
const plugin = require("tailwindcss/plugin");

// Dark surfaces and text, shared with the CMS
const DARK = {
  page: "#0f141d",
  surface: "#171d29",
  raised: "#1f2635",
  border: "#2b3447",
  borderStrong: "#3a4459",
  mutedFill: "#56617a",
  textMax: "#f3f5f9",
};

const GREYS = ["slate", "gray", "zinc", "neutral", "stone"];
const HUES = [
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan",
  "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
];
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Grey backgrounds and borders turn into dark surfaces
const GREY_FILL = {
  50: DARK.page,
  100: DARK.raised,
  200: DARK.border,
  300: DARK.borderStrong,
  400: DARK.mutedFill,
  // Near-black buttons and tooltips stay visible on the dark page
  800: "#46516a",
  900: DARK.borderStrong,
  950: DARK.borderStrong,
};
// Grey text turns light
const GREY_TEXT = {
  300: "#a3adc0",
  400: "#b4bdcc",
  500: "#c5ccd8",
  600: "#d3d8e2",
  700: "#cdd3df",
  800: "#e2e6ee",
  900: DARK.textMax,
  950: DARK.textMax,
};
// Pale colour tints become a share of the 500 shade on the dark surface
const HUE_TINT = { 50: 0.14, 100: 0.2, 200: 0.3, 300: 0.4 };
// Dark coloured text takes a lighter shade of the same colour
const HUE_TEXT = { 500: 400, 600: 400, 700: 300, 800: 200, 900: 200, 950: 200 };

// Colour maths (sRGB and OKLab)
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function toOklab(rgb) {
  const [r, g, b] = rgb.map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.round(Math.min(1, Math.max(0, toGamma(v))) * 255));
}
function mix(hex, baseHex, weight) {
  const a = toOklab(hexToRgb(hex));
  const b = toOklab(hexToRgb(baseHex));
  return fromOklab(a.map((v, i) => v * weight + b[i] * (1 - weight)));
}
const channels = (value) => (typeof value === "string" ? hexToRgb(value) : value).join(" ");
const ref = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const light = {};
const dark = {};
const fillColors = {};
const textColors = {};

function addVariable(name, lightValue, darkValue) {
  light[`--${name}`] = channels(lightValue);
  dark[`--${name}`] = channels(darkValue);
  return ref(name);
}

// Backgrounds, borders, rings and lines
for (const family of [...GREYS, ...HUES]) {
  fillColors[family] = {};
  const darkFor = (shade) =>
    GREYS.includes(family)
      ? GREY_FILL[shade]
      : HUE_TINT[shade] && mix(colors[family][500], DARK.surface, HUE_TINT[shade]);
  for (const shade of SHADES) {
    const darkValue = darkFor(shade);
    if (darkValue) {
      fillColors[family][shade] = addVariable(
        `palette-${family}-${shade}`,
        colors[family][shade],
        darkValue
      );
    }
  }
}
fillColors.white = addVariable("palette-white", colors.white, DARK.surface);

// Text: full families, so shades that don't change keep their own value
for (const family of [...GREYS, ...HUES]) {
  textColors[family] = {};
  for (const shade of SHADES) {
    const darkValue = GREYS.includes(family)
      ? GREY_TEXT[shade]
      : HUE_TEXT[shade] && colors[family][HUE_TEXT[shade]];
    textColors[family][shade] = darkValue
      ? addVariable(`palette-text-${family}-${shade}`, colors[family][shade], darkValue)
      : colors[family][shade];
  }
}
textColors.white = colors.white;
textColors.black = addVariable("palette-text-black", colors.black, DARK.textMax);

const paletteVariables = plugin(({ addBase }) => {
  addBase({
    ":root, .theme-light": light,
    "html.dark": dark,
  });
});

module.exports = { fillColors, textColors, paletteVariables };
