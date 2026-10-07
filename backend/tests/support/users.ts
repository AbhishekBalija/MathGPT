import { randomUUID } from "node:crypto";
import { apiUrl } from "./test-app";

export const TEST_PASSWORD = "Test123!";

/** An email address no other test uses, so tests never collide. */
export function uniqueEmail(): string {
  return `user-${randomUUID()}@example.test`;
}

/** Signs up a new User through the API and returns their access token. */
export async function registerUser(email = uniqueEmail()): Promise<{
  email: string;
  accessToken: string;
}> {
  const res = await fetch(apiUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: TEST_PASSWORD, name: "Test User" }),
  });
  if (res.status !== 200) {
    throw new Error(`Register failed with ${res.status}: ${await res.text()}`);
  }

  const body = await res.json();
  return { email, accessToken: body.accessToken };
}
