"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import SiteFooter from "../../components/SiteFooter";
import SiteNav from "../../components/SiteNav";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/");
    });
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, " ");
    const accountEmail = normalizedName === "raghav joshi" ? "test-cyber@gmail.com" : null;

    if (!accountEmail) {
      setError("We couldn't find an account with that name.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: accountEmail, password });
    if (signInError) {
      setError(signInError.code === "email_not_confirmed"
        ? "Please confirm your account email before signing in."
        : "That name or password is not correct. Please try again.");
      setLoading(false);
      return;
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <main className="site-shell">
      <SiteNav />
      <section className="login-content" aria-labelledby="login-heading">
        <div className="login-copy">
          <h1 id="login-heading">Welcome back</h1>
          <p>Sign in to continue with your cyber crime report.</p>
        </div>
        <form className="login-card" onSubmit={handleSubmit}>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
      <SiteFooter />
    </main>
  );
}
