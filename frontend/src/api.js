import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.DEV ? "/api" : "https://www.moustass.com/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers.Accept = "application/json";
  return config;
});

export default api;
