/**
 * Safety guard for the test run.
 *
 * Tests create users, wipe tables and drop data, so they must only ever
 * touch the database on this machine. This runs before anything connects and
 * stops the whole run if the Postgres URL points somewhere else, or if the
 * Postgres database is not a dedicated test database (so a local dev
 * database is safe).
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export interface TestDatabaseUrls {
  DATABASE_URL: string;
}

function parseUrl(name: string, url: string): URL {
  try {
    return new URL(url);
  } catch {
    throw new Error(
      `Refusing to run tests: ${name} is not a valid URL. It must point to localhost.`
    );
  }
}

function assertLocal(name: string, url: string): void {
  const { hostname } = parseUrl(name, url);
  if (!LOCAL_HOSTS.has(hostname)) {
    // Only the host is printed, so a password in the URL never reaches the logs
    throw new Error(
      `Refusing to run tests: ${name} must point to localhost, but it points to "${hostname}". ` +
        "Tests wipe the database, so they never run against a remote one."
    );
  }
}

// Tests drop every table, so only a database named like `neomath_test` is allowed
function assertTestDatabaseName(url: string): void {
  const databaseName = parseUrl("DATABASE_URL", url).pathname.slice(1);
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests: the Postgres database name must end in "_test", but it is "${databaseName}". ` +
        "Tests drop every table, so they never run against your development database."
    );
  }
}

export function assertLocalDatabaseUrls(urls: TestDatabaseUrls): void {
  assertLocal("DATABASE_URL", urls.DATABASE_URL);
  assertTestDatabaseName(urls.DATABASE_URL);
}
