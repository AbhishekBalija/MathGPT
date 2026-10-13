import { describe, expect, it } from "vitest";
import { isDisposableEmail } from "../../src/modules/auth/disposable-email";

describe("isDisposableEmail", () => {
  it.each(["user@mailinator.com", "USER@Mailinator.COM", "a@sub.mailinator.com"])("flags %s", (email) => {
    expect(isDisposableEmail(email)).toBe(true);
  });

  it.each(["student@gmail.com", "a@yahoo.co.in", "teacher@school.edu.in", "me@rediffmail.com", "x@icloud.com"])(
    "allows %s",
    (email) => {
      expect(isDisposableEmail(email)).toBe(false);
    }
  );

  it("does not match a domain that only ends with the same letters", () => {
    // Neither is on the list, though both contain "mailinator.com"
    expect(isDisposableEmail("a@schoolmailinator.com")).toBe(false);
    expect(isDisposableEmail("a@mailinator.com.au")).toBe(false);
  });
});
