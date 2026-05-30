const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_URL;
const API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;
const INSTANCE_NAME = "maxcrm";

async function request(path, method = "GET", body = null) {
  const response = await fetch(`${EVOLUTION_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: API_KEY,
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    throw new Error("Erro na Evolution API");
  }

  return response.json();
}

export const connectInstance = () =>
  request(`/instance/connect/${INSTANCE_NAME}`);

export const getConnectionState = () =>
  request(`/instance/connectionState/${INSTANCE_NAME}`);

export const sendText = (number, text) =>
  request(`/message/sendText/${INSTANCE_NAME}`, "POST", {
    number,
    text,
  });