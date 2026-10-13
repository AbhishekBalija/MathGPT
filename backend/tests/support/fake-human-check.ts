/**
 * Stands in for Cloudflare Turnstile during tests, so tests never call it.
 * Every token passes, except this one.
 */
import type { HumanCheck } from "../../src/modules/auth/turnstile";

export const FAKE_TURNSTILE_FAIL = "FAKE_TURNSTILE_FAIL";

export const fakeHumanCheck: HumanCheck = async (token) => token !== FAKE_TURNSTILE_FAIL;
