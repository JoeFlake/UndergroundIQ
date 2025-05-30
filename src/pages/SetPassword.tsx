import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Support both #/set-password#access_token=... and #access_token=...
    let hash = window.location.hash;
    // If there are two hashes, use the second one
    if (hash.includes("#") && hash.indexOf("#", 1) !== -1) {
      hash = hash.substring(hash.indexOf("#", 1) + 1);
    } else {
      hash = hash.substring(1);
    }
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    if (type === "invite" && accessToken) {
      setToken(accessToken);
      setRefreshToken(refreshToken || "");
    } else {
      setMessage("Invalid or expired invite link.");
    }
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    // Set the session with the access token
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      setMessage(sessionError.message);
      return;
    }
    // Now update the password
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password set! Redirecting...");
      // Wait a moment for the session to update, then redirect
      setTimeout(() => {
        navigate("/");
      }, 1000);
    }
  };

  if (!token)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <div className="text-center text-red-500">{message}</div>
        </div>
      </div>
    );

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSetPassword}
        className="bg-white p-8 rounded shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          Set Your Password
        </h2>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Set Password
        </button>
        {message && (
          <div className="mt-4 text-center text-red-500">{message}</div>
        )}
      </form>
    </div>
  );
}
