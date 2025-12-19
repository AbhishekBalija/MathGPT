import axios from "axios";

// Get the appropriate API URL based on environment
const getApiUrl = (): string => {
  const isDev = import.meta.env.MODE === "development";

  if (isDev) {
    return import.meta.env.VITE_API_URL_DEV || "http://localhost:3000";
  }

  return import.meta.env.VITE_API_URL_PROD || "";
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  // Note: withCredentials is NOT needed since we use JWT tokens in Authorization header
  // withCredentials: true causes CORS issues with AWS API Gateway's wildcard origin
});

// Request interceptor to attach auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (zustand persist stores it there)
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Ignore parse errors
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const authStorage = localStorage.getItem("auth-storage");
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          const refreshToken = parsed?.state?.refreshToken;

          if (refreshToken) {
            const response = await axios.post(`${getApiUrl()}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } =
              response.data;

            // Update stored tokens
            parsed.state.token = accessToken;
            parsed.state.refreshToken = newRefreshToken;
            localStorage.setItem("auth-storage", JSON.stringify(parsed));

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed - clear auth state
        localStorage.removeItem("auth-storage");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { getApiUrl };
