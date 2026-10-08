import { randomUUID } from "node:crypto";
import { vi } from "vitest";
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

/**
 * Signs up a User and makes them an Admin. The API can never grant admin
 * rights to yourself, so this uses the repository directly, the same way
 * `scripts/create-admin.ts` does. Use it for setup only, never to assert.
 */
export async function registerAdmin(): Promise<{
  email: string;
  accessToken: string;
}> {
  const { userRepository } = await import("../../src/modules/users/user.repository");
  const admin = await registerUser();
  const user = await userRepository.findByEmail(admin.email);
  if (!user) {
    throw new Error("Registered admin not found");
  }
  await userRepository.setAdmin(user.id, true);
  return admin;
}

/** Calls the API with a User's access token. */
export function authedFetch(
  accessToken: string,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<Response> {
  return fetch(apiUrl(path), {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

/** The newest 6-digit Verification Code emailed to an address, like a User reading their inbox. */
export async function latestVerificationCode(email: string): Promise<string> {
  const { fakeEmailSender } = await import("./test-app");
  let code: string | undefined;
  await vi.waitFor(() => {
    const emails = fakeEmailSender.emailsTo(email);
    const matches = emails
      .map((sent) => sent.html.match(/data-verification-code="(\d{6})"/)?.[1])
      .filter((found): found is string => found !== undefined);
    code = matches.at(-1);
    if (!code) {
      throw new Error(`No Verification Code emailed to ${email} yet`);
    }
  });
  return code ?? "";
}

/** Signs up and verifies the email through the API, ready to solve. */
export async function registerVerifiedUser(email = uniqueEmail()): Promise<{
  email: string;
  accessToken: string;
}> {
  const user = await registerUser(email);
  const code = await latestVerificationCode(user.email);
  const res = await authedFetch(user.accessToken, "/auth/verify-email", {
    method: "POST",
    body: { code },
  });
  if (res.status !== 200) {
    throw new Error(`Verify failed with ${res.status}: ${await res.text()}`);
  }
  return user;
}
