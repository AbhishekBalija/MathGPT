/**
 * Where to go after logging in. A page the user was sent away from wins, so
 * a link to /admin/reports lands there. The one exception is /app, the
 * student home: an old /app tab or bookmark should not hide the admin
 * dashboard from an Admin.
 */
export function pathAfterLogin(savedPath: string | undefined, isAdmin: boolean | undefined): string {
  const home = isAdmin ? "/admin" : "/app";
  if (!savedPath || savedPath === "/" || savedPath === "/app") {
    return home;
  }
  return savedPath;
}
