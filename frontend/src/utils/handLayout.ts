export function computePeek(
  cardCount: number,
  containerWidth: number,
  cardWidth: number,
): number {
  if (cardCount <= 1) return 0;
  const naturalPeek = 35;
  const maxPeek = Math.floor((containerWidth - cardWidth) / (cardCount - 1));
  return Math.min(naturalPeek, Math.max(0, maxPeek));
}
