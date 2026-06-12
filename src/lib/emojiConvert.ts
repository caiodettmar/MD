import { nameToEmoji, emojiToName } from "gemoji";

let emojiRegex: RegExp | null = null;

function getEmojiRegex(): RegExp {
  if (!emojiRegex) {
    // Sort keys by length descending to match combined emojis first
    const emojiList = Object.keys(emojiToName).sort((a, b) => b.length - a.length);
    const escaped = emojiList.map((emoji) =>
      emoji.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    emojiRegex = new RegExp(escaped.join("|"), "g");
  }
  return emojiRegex;
}

/**
 * Replaces emoji shortcodes (e.g. :smile:) with their Unicode equivalent (😊).
 */
export function markdownToUnicodeEmojis(markdown: string): string {
  if (!markdown) {
    return "";
  }
  return markdown.replace(/:([a-z0-9_+-]+):/gi, (match, name) => {
    return nameToEmoji[name.toLowerCase()] ?? match;
  });
}

/**
 * Replaces Unicode emojis (😊) with their shortcode equivalents (:smile:).
 */
export function unicodeToEmojiShortcodes(markdown: string): string {
  if (!markdown) {
    return "";
  }
  const regex = getEmojiRegex();
  return markdown.replace(regex, (match) => {
    const name = emojiToName[match];
    return name ? `:${name}:` : match;
  });
}
