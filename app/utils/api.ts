export const getApiBaseUrl = (fastapi: boolean = false, betterauth: boolean = false): string => {
  const isProduction = process.env.NODE_ENV === "production";

  if (betterauth) {
    return isProduction ? "http://localhost:5173" : "http://localhost:5173";
  } else if (fastapi) {
    // AI endpoint is now integrated into the main app
    return isProduction ? "http://localhost:5173" : "http://localhost:5173";
  } else {
    return isProduction ? "http://localhost:5173/render" : "http://localhost:8000";   // remotion render server
  }
};

export const apiUrl = (endpoint: string, fastapi: boolean = false, betterauth: boolean = false): string => {
  const baseUrl = getApiBaseUrl(fastapi, betterauth);
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  return path ? `${baseUrl}${path}` : `${baseUrl}`;
};