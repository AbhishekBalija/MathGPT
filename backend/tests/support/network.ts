/** A made-up client address, as Vercel would put in X-Forwarded-For. */
export function randomIp(): string {
  const part = () => Math.floor(Math.random() * 254) + 1;
  return `10.${part()}.${part()}.${part()}`;
}
