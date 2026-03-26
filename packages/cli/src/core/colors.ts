const RESET = "\u001b[0m";
const ORANGE = "\u001b[38;5;208m";
const ORANGE_STRONG = "\u001b[38;5;202m";
const GRAY = "\u001b[90m";
const RED = "\u001b[31m";
const GREEN = "\u001b[32m";

export function colorOrange(text: string): string {
  return `${ORANGE}${text}${RESET}`;
}

export function colorOrangeStrong(text: string): string {
  return `${ORANGE_STRONG}${text}${RESET}`;
}

export function colorGray(text: string): string {
  return `${GRAY}${text}${RESET}`;
}

export function colorRed(text: string): string {
  return `${RED}${text}${RESET}`;
}

export function colorGreen(text: string): string {
  return `${GREEN}${text}${RESET}`;
}
