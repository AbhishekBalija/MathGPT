import { describe, expect, it, vi } from "vitest";
import { fakeEmailSender } from "./support/test-app";
import { registerUser } from "./support/users";

describe("emails", () => {
  it("emails a Verification Code to a new User", async () => {
    const { email } = await registerUser();

    // The email is sent in the background, after the response
    await vi.waitFor(() => {
      expect(fakeEmailSender.emailsTo(email)).toHaveLength(1);
    });

    const [sent] = fakeEmailSender.emailsTo(email);
    expect(sent?.subject).toMatch(/^\d{6} is your NeoMath verification code$/);
  });
});
