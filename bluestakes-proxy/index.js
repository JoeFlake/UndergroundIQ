const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

async function getBearerToken(username, password) {
  const loginUrl = "https://newtin-api.bluestakes.org/api/login";
  const response = await fetch(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }).toString(),
  });
  const text = await response.text();
  console.log("Login response status:", response.status);
  console.log("Login response body:", text);
  if (!response.ok) {
    throw new Error("Failed to log in for Bearer token");
  }
  const data = JSON.parse(text);
  // The token is in the 'Authorization' field, e.g. 'Bearer eyJ...'
  if (data.Authorization && data.Authorization.startsWith("Bearer ")) {
    return data.Authorization.slice(7); // Remove 'Bearer '
  }
  throw new Error("Bearer token not found in login response");
}

app.post("/api/bluestakes/tickets", async (req, res) => {
  let { username, password, address, city, state, zip } = req.body;
  // Mask password for logging
  const maskedPassword = password ? password.replace(/./g, "*") : "";
  console.log("Proxy received:", {
    username,
    password: maskedPassword,
    address,
    city,
    state,
    zip,
  });

  // If city/state/zip are missing, try to parse from address
  if (!city || !state || !zip) {
    const parts = address.split(",").map((s) => s.trim());
    if (parts.length === 4) {
      address = parts[0];
      city = parts[1];
      state = parts[2];
      zip = parts[3];
    }
  }

  // Prepare query params for /tickets/search
  const params = new URLSearchParams();
  if (address) params.append("address", address);
  if (city) params.append("place", city);
  if (state) params.append("state", state);
  if (zip) params.append("zip", zip); // If supported
  params.append("limit", "50"); // or whatever limit you want

  const url = `https://newtin-api.bluestakes.org/api/tickets/search?${params.toString()}`;

  try {
    // 1. Get Bearer token
    const token = await getBearerToken(username, password);
    console.log("Using Bearer token:", token);

    // 2. Use Bearer token for search
    console.log("Proxy sending request to:", url);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const text = await response.text();
    console.log("Blue Stakes API response status:", response.status);
    console.log("Blue Stakes API response body:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.status(response.status).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({
      error: "Failed to fetch from Blue Stakes",
      details: err.message,
    });
  }
});

app.post("/api/bluestakes/summary", async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Login to get Bearer token
    const loginResp = await fetch(
      "https://newtin-api.bluestakes.org/api/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password }).toString(),
      }
    );
    const loginData = await loginResp.json();
    if (!loginResp.ok || !loginData.Authorization) {
      return res.status(401).json({ error: "Failed to log in to Blue Stakes" });
    }
    const token = loginData.Authorization.replace("Bearer ", "");

    // 2. Call /tickets/summary with Bearer token
    const summaryResp = await fetch(
      "https://newtin-api.bluestakes.org/api/tickets/summary",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    const summaryData = await summaryResp.json();
    res.status(summaryResp.status).json(summaryData);
  } catch (err) {
    res.status(500).json({ error: "Proxy error", details: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
