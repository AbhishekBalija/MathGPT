import api from "./api";

// Whether solving is paused and sign-ups are open, set by an admin in Settings
export interface AppStatus {
  maintenance: { on: boolean; message: string };
  signupsOpen: boolean;
}

export async function getAppStatus(): Promise<AppStatus> {
  const response = await api.get<AppStatus>("/api/app-status");
  return response.data;
}
