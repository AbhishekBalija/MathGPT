import { describe, expect, it, vi } from "vitest";
import { fakeEmailSender } from "./support/test-app";
import { registerUser } from "./support/users";

describe("emails", () => {
  it("sends a welcome email to a new User", async () => {
    const { email } = await registerUser();

    // The email is sent in the background, after the response
    await vi.waitFor(() => {
      expect(fakeEmailSender.emailsTo(email)).toHaveLength(1);
    });

    const [welcome] = fakeEmailSender.emailsTo(email);
    expect(welcome?.subject).toContain("Welcome to NeoMath");
  });
});
