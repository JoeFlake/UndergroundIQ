import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    // Get token from URL hash (Supabase uses hash for invite links)
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get("access_token");
    const type = params.get("type");
    if (type === "invite" && accessToken) {
      setToken(accessToken);
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
      refresh_token: "",
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
      setMessage("Password set! You can now log in.");
    }
  };

  if (!token) return <div>{message}</div>;

  return (
    <form onSubmit={handleSetPassword}>
      <h2>Set Your Password</h2>
      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <button type="submit">Set Password</button>
      {message && <div>{message}</div>}
    </form>
  );
}