import { nameToEmoji } from "gemoji";

export interface EmojiPreset {
  name: string;
  emoji: string;
}

export const EMOJI_PRESETS: EmojiPreset[] = [
  "smile",
  "grinning",
  "joy",
  "heart",
  "thumbsup",
  "thumbsdown",
  "fire",
  "rocket",
  "tada",
  "warning",
  "bulb",
  "memo",
  "white_check_mark",
  "x",
  "question",
  "eyes",
]
  .map((name) => ({
    name,
    emoji: nameToEmoji[name] ?? "",
  }))
  .filter((entry) => entry.emoji.length > 0);
