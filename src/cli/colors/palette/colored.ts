import { Colorette, createColors } from "colorette";
import { Palette } from "../index.js";

export const availableColors: Colorette = createColors({ useColor: true });
export const { white, bgRed, red, yellow, green, blue, gray, cyan } = availableColors;

export const colored: Palette = {
  default: white,
  60: bgRed,
  50: red,
  40: yellow,
  30: green,
  20: blue,
  10: gray,
  message: cyan,
  greyMessage: gray,
};
