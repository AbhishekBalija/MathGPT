/**
 * Runs before every test file: starts the real Express app on a random free
 * port, with the fake AI solver and fake email sender, and closes it after.
 */

import { once } from "node:events";
import { afterAll } from "vitest";
import { createApp } from "../../src/create-app";
import { randomIp } from "./network";
import { fakeEmailSender, fakeMathSolver } from "./test-app";

const server = createApp({
  solver: fakeMathSolver,
  emailSender: fakeEmailSender,
}).listen(0, "127.0.0.1");
await once(server, "listening");

const address = server.address();
if (address === null || typeof address === "string") {
  throw new Error("Test app did not start on a TCP port");
}
process.env.TEST_API_URL = `http://127.0.0.1:${address.port}`;

// Every test request would otherwise come from 127.0.0.1 and share one
// per-IP Rate Limit. Like real visitors behind Vercel's proxy, each request
// gets its own X-Forwarded-For address, unless the test sets one itself.
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = input instanceof Request ? input.url : input.toString();
  if (!url.startsWith(process.env.TEST_API_URL ?? "")) {
    return realFetch(input, init);
  }

  // Start from a Request's own headers, then apply any passed in init
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
  if (!headers.has("X-Forwarded-For")) {
    headers.set("X-Forwarded-For", randomIp());
  }
  return realFetch(input, { ...init, headers });
};

afterAll(async () => {
  globalThis.fetch = realFetch;
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
