export function makeIdempotencyKey(parts: string[]): string {
  return parts.join("-");
}
