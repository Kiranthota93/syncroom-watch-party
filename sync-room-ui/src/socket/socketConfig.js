export const resolveSocketUrl = (env = import.meta.env) => {
  const configuredUrl = env?.VITE_SOCKET_URL || env?.VITE_API_URL || "";

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost:8000";
};
