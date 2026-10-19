import React, { createContext, useContext, useEffect, useState } from "react";

// ===============================
// AWS COGNITO CONFIGURATION
// ===============================
const COGNITO_DOMAIN =
  "https://ap-south-1f1mabpajf.auth.ap-south-1.amazoncognito.com";

const CLIENT_ID = "47jk6342rqcsomhfd02ugv56bt";

const REDIRECT_URI = "https://main.d1rcz4wtnwr716.amplifyapp.com/";


// ===============================
// AUTH CONTEXT
// ===============================

const AuthContext = createContext(null);

// ===============================
// PKCE HELPERS
// ===============================

function base64UrlEncode(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateRandomString(length = 64) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

  const randomValues = new Uint8Array(length);

  crypto.getRandomValues(randomValues);

  return Array.from(
    randomValues,
    (value) => characters[value % characters.length]
  ).join("");
}

async function createCodeChallenge(verifier) {
  const encoder = new TextEncoder();

  const data = encoder.encode(verifier);

  const digest = await crypto.subtle.digest("SHA-256", data);

  return base64UrlEncode(digest);
}

// ===============================
// AUTH PROVIDER
// ===============================

let isHandlingCallback = false;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // =============================
  // CHECK EXISTING LOGIN
  // =============================

  useEffect(() => {
    const initializeAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      // If Cognito has redirected back with an authorization code,
      // exchange that code for tokens.
      if (code) {
        if (isHandlingCallback) return; // Prevent double execution in StrictMode
        isHandlingCallback = true;

        console.log("Cognito callback detected");
        console.log("Authorization code received");

        const success = await handleCallback();

        if (!success) {
          console.error("Cognito callback failed.");
          setLoading(false);
          isHandlingCallback = false;
          return;
        }

        console.log("Token exchange successful");
        console.log("Authentication state updated");
        setLoading(false);
        isHandlingCallback = false;
        return;
      }

      // Otherwise, check for an existing login session.
      const storedAccessToken =
        sessionStorage.getItem("access_token");

      const storedIdToken =
        sessionStorage.getItem("id_token");

      const storedUser =
        sessionStorage.getItem("user");

      if (storedAccessToken) {
        setAccessToken(storedAccessToken);
      }

      if (storedIdToken) {
        setIdToken(storedIdToken);
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          sessionStorage.removeItem("user");
        }
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  // =============================
  // LOGIN
  // =============================

  const login = async () => {
    try {
      // Generate PKCE verifier
      const codeVerifier = generateRandomString(64);

      // Generate challenge
      const codeChallenge = await createCodeChallenge(codeVerifier);

      // Store verifier until Cognito redirects back
      sessionStorage.setItem("pkce_code_verifier", codeVerifier);

      // CSRF protection
      const state = generateRandomString(32);

      sessionStorage.setItem("oauth_state", state);

      // Cognito login URL
      const params = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: "openid email phone",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: state,
      });

      const loginUrl = `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;

      window.location.href = loginUrl;
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  // =============================
  // SIGN UP
  // =============================

  const signUp = async () => {
    try {
      // Generate PKCE verifier
      const codeVerifier = generateRandomString(64);

      // Generate challenge
      const codeChallenge = await createCodeChallenge(codeVerifier);

      // Store verifier until Cognito redirects back
      sessionStorage.setItem("pkce_code_verifier", codeVerifier);

      // CSRF protection
      const state = generateRandomString(32);

      sessionStorage.setItem("oauth_state", state);

      // Cognito signup URL
      const params = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: "openid email phone",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: state,
      });

      const signupUrl = `${COGNITO_DOMAIN}/signup?${params.toString()}`;

      window.location.href = signupUrl;
    } catch (error) {
      console.error("Signup error:", error);
    }
  };

  // =============================
  // HANDLE COGNITO CALLBACK
  // =============================

  const handleCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);

    const code = urlParams.get("code");
    const returnedState = urlParams.get("state");
    const error = urlParams.get("error");

    // Cognito returned an error
    if (error) {
      console.error(
        "Cognito login error:",
        error,
        urlParams.get("error_description")
      );

      return false;
    }

    // No authorization code
    if (!code) {
      return false;
    }

    // Check state
    const savedState = sessionStorage.getItem("oauth_state");

    if (savedState && returnedState !== savedState) {
      console.error("OAuth state mismatch.");
      return false;
    }

    const codeVerifier = sessionStorage.getItem("pkce_code_verifier");

    if (!codeVerifier) {
      console.error("PKCE code verifier not found.");
      return false;
    }

    console.log("PKCE verifier found");
    console.log("Exchanging code for tokens");

    try {
      // Exchange authorization code for tokens
      const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
        method: "POST",

        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: CLIENT_ID,
          code: code,
          redirect_uri: REDIRECT_URI,
          code_verifier: codeVerifier,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Token exchange failed:", data);

        return false;
      }

      // Save tokens
      sessionStorage.setItem("access_token", data.access_token);

      if (data.id_token) {
        sessionStorage.setItem("id_token", data.id_token);
      }

      if (data.refresh_token) {
        sessionStorage.setItem("refresh_token", data.refresh_token);
      }

      setAccessToken(data.access_token);

      if (data.id_token) {
        setIdToken(data.id_token);
      }

      // Decode ID token payload for UI information
      if (data.id_token) {
        const payload = decodeJwt(data.id_token);

        setUser(payload);

        sessionStorage.setItem("user", JSON.stringify(payload));
      }

      // Clean OAuth parameters from browser URL
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      // Remove temporary PKCE values
      sessionStorage.removeItem("pkce_code_verifier");
      sessionStorage.removeItem("oauth_state");

      return true;
    } catch (error) {
      console.error("Authentication error:");
      console.dir(error);
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        console.error(
          "This is likely a CORS error. Ensure that your Cognito App Client has the correct Allowed Callback URLs, Allowed OAuth Flows, and that your browser isn't blocking the request."
        );
      }
      return false;
    }
  };

  // =============================
  // LOGOUT
  // =============================

  const logout = () => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("id_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("pkce_code_verifier");
    sessionStorage.removeItem("oauth_state");

    setAccessToken(null);
    setIdToken(null);
    setUser(null);

    const logoutUrl =
      `${COGNITO_DOMAIN}/logout` +
      `?client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&logout_uri=${encodeURIComponent(REDIRECT_URI)}`;

    window.location.href = logoutUrl;
  };

  // =============================
  // GET ACCESS TOKEN
  // =============================

  const getAccessToken = () => {
    return sessionStorage.getItem("access_token");
  };

  // =============================
  // AUTH VALUE
  // =============================

  const value = {
    user,
    accessToken,
    idToken,
    loading,
    isAuthenticated: !!accessToken,

    login,
    signUp,
    logout,
    handleCallback,
    getAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ===============================
// USE AUTH HOOK
// ===============================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

// ===============================
// JWT DECODER
// ===============================

function decodeJwt(token) {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];

    const decoded = atob(
      payload.replace(/-/g, "+").replace(/_/g, "/")
    );

    return JSON.parse(decoded);
  } catch (error) {
    console.error("JWT decode error:", error);

    return null;
  }
}