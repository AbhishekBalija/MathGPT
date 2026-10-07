import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { apiUrl } from "./support/test-app";
import {
  TEST_PASSWORD,
  authedFetch,
  registerUser,
  uniqueEmail,
} from "./support/users";

function post(path: string, body: unknown) {
  return fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function signUp(email: string) {
  return post("/auth/register", { email, password: TEST_PASSWORD, name: "Ada" });
}

describe("email addresses", () => {
  it("lets a User log in with their email in any letter case", async () => {
    const email = uniqueEmail();
    await signUp(email.toUpperCase());

    const res = await post("/auth/login", { email, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect((await res.json()).user.email).toBe(email);
  });

  it("refuses a second sign-up with the same email in another case", async () => {
    const email = uniqueEmail();
    await signUp(email);

    const res = await signUp(email.toUpperCase());

    expect(res.status).toBe(409);
  });
});

describe("sessions", () => {
  it("shows the current User, not yet verified after an email sign-up", async () => {
    const { email, accessToken } = await registerUser();

    const res = await authedFetch(accessToken, "/auth/me");

    expect(res.status).toBe(200);
    const { user } = await res.json();
    expect(user).toMatchObject({ email, isAdmin: false, emailVerified: false });
  });

  it("gives a working access token in exchange for a refresh token", async () => {
    const res = await signUp(uniqueEmail());
    const { refreshToken } = await res.json();

    const refreshed = await post("/auth/refresh", { refreshToken });
    expect(refreshed.status).toBe(200);
    const { accessToken } = await refreshed.json();

    const me = await authedFetch(accessToken, "/auth/me");
    expect(me.status).toBe(200);
  });

  it("rejects a request without a token", async () => {
    const res = await fetch(apiUrl("/auth/me"));

    expect(res.status).toBe(401);
  });

  it("rejects a correctly signed token whose user id is not a UUID", async () => {
    // Shape of tokens issued before the move to Postgres (a MongoDB id)
    const token = jwt.sign(
      { userId: "507f1f77bcf86cd799439011" },
      process.env.JWT_SECRET ?? ""
    );

    const res = await authedFetch(token, "/auth/me");

    expect(res.status).toBe(401);
  });

  it("rejects a token for a User who no longer exists", async () => {
    const token = jwt.sign(
      { userId: "00000000-0000-4000-8000-000000000000" },
      process.env.JWT_SECRET ?? ""
    );

    const res = await authedFetch(token, "/auth/me");

    expect(res.status).toBe(401);
  });
});
