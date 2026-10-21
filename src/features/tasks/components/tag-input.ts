const TAG_PATTERN = /^[\p{L}\d_-]{1,32}$/u;
export const MAX_TAGS = 8;

/** "#work, home #urgent" → ["work", "home", "urgent"]; invalid pieces are dropped. */
export function parseTags(text: string): string[] {
  const tags: string[] = [];
  for (const piece of text.split(/[\s,]+/)) {
    const tag = piece.replace(/^#/, "").toLowerCase();
    if (TAG_PATTERN.test(tag) && !tags.includes(tag) && tags.length < MAX_TAGS) tags.push(tag);
  }
  return tags;
}
