export function scoreSlashMatch(
  query: string,
  label: string,
  keywords: string[],
): number {
  if (!query) {
    return 0;
  }

  const normalizedQuery = query.toLowerCase();
  const normalizedLabel = label.toLowerCase();
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());

  if (normalizedLabel === normalizedQuery) {
    return 100;
  }

  if (normalizedKeywords.some((keyword) => keyword === normalizedQuery)) {
    return 95;
  }

  if (normalizedLabel.startsWith(normalizedQuery)) {
    return 80;
  }

  const prefixKeyword = normalizedKeywords.find((keyword) =>
    keyword.startsWith(normalizedQuery),
  );
  if (prefixKeyword) {
    return 70 + Math.min(prefixKeyword.length, 10);
  }

  if (normalizedQuery.length === 1) {
    const singleCharKeyword = normalizedKeywords.find(
      (keyword) => keyword.length === 1 && keyword === normalizedQuery,
    );
    if (singleCharKeyword) {
      return 50;
    }
  }

  return -1;
}

export function matchesSlashQuery(
  query: string,
  label: string,
  keywords: string[],
): boolean {
  return scoreSlashMatch(query, label, keywords) >= 0;
}
