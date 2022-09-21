import { Colorette, createColors } from "colorette";

export const availableColors: Colorette = createColors({ useColor: true });
export const { white, bgRed, red, yellow, green, blue, gray, cyan } = availableColors;

export const colored = {
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
