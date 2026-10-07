/**
 * Runs before every test file: starts the real Express app on a random free
 * port, with the fake AI solver and fake email sender, and closes it after.
 */

import { once } from "node:events";
import { afterAll } from "vitest";
import { createApp } from "../../src/app";
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

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
