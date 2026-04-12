// src/pages/LoginPage.jsx
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "./LoginPage.module.css";

const ERROR_MESSAGES = {
  oauth_failed: "Google sign-in failed. Please try again.",
  oauth_no_code: "Google sign-in was cancelled.",
};

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [params] = useSearchParams();

  const oauthError = params.get("error");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister ? { name, email, password } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      login(data.token);
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = "/api/auth/google";
  }

  return (
    <div className={styles.page}>
      {/* Left decorative panel */}
      <div className={styles.panel}>
        <div className={styles.panelContent}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>◈</span>
            <span>DietDash</span>
          </div>
          <h1 className={styles.panelHeading}>
            Nutrition<br />Intelligence<br />Platform
          </h1>
          <p className={styles.panelSub}>
            Explore 500+ recipes across every diet type. Filter, search, and
            understand your nutritional data at a glance.
          </p>
          <div className={styles.stats}>
            <div className={styles.stat}><span className={styles.statNum}>8</span><span className={styles.statLabel}>Diet types</span></div>
            <div className={styles.stat}><span className={styles.statNum}>500+</span><span className={styles.statLabel}>Recipes</span></div>
            <div className={styles.stat}><span className={styles.statNum}>4</span><span className={styles.statLabel}>Live charts</span></div>
          </div>
        </div>
        <div className={styles.grid} aria-hidden="true" />
      </div>

      {/* Right form panel */}
      <div className={styles.formPanel}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{isRegister ? "Create account" : "Welcome back"}</h2>
          <p className={styles.cardSub}>
            {isRegister ? "Start exploring nutritional insights" : "Sign in to your dashboard"}
          </p>

          {(oauthError || error) && (
            <div className={styles.errorBanner}>
              {error || ERROR_MESSAGES[oauthError] || "An error occurred"}
            </div>
          )}

          <button className={styles.googleBtn} onClick={handleGoogleLogin} type="button">
            <GoogleIcon />
            Continue with Google
          </button>

          <div className={styles.divider}><span>or</span></div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {isRegister && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="name">Full name</label>
                <input
                  id="name"
                  className={styles.input}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Johnson"
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input
                id="email"
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? "Min. 8 characters" : "••••••••"}
                required
                minLength={isRegister ? 8 : 1}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>

            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? <span className={styles.spinnerSmall} /> : null}
              {loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className={styles.toggle}>
            {isRegister ? "Already have an account?" : "Don't have an account?"}
            {" "}
            <button
              className={styles.toggleBtn}
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              type="button"
            >
              {isRegister ? "Sign in" : "Register"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
