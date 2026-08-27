"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const accountName = user?.user_metadata?.full_name || user?.email;

  const signOut = async () => {
    setProfileOpen(false);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <nav className="site-nav" aria-label="Main navigation">
      <a className="brand" href="/" aria-label="Cyber Crime Reporting home">
        <img className="brand-logo" src="/assets/logo.png" alt="Cyber Crime Reporting" />
      </a>
      <div className="nav-links">
        <a href="#faq">FAQ</a>
        {pathname !== "/login" && !user && <a className="nav-account" href="/login">Sign in</a>}
        {user && pathname !== "/login" && (
          <div className="profile-menu">
            <button
              className="profile-trigger"
              type="button"
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="profile-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="12" cy="8" r="3.2" />
                  <path d="M5.5 20c.7-3.1 3-5 6.5-5s5.8 1.9 6.5 5" />
                </svg>
              </span>
            </button>
            {profileOpen && (
              <div className="profile-dropdown">
                <p>{accountName}</p>
                <button type="button" onClick={() => setProfileOpen(false)}>Profile</button>
                <button type="button" onClick={signOut}>Sign out</button>
              </div>
            )}
          </div>
        )}
      </div>
      <button className="nav-menu-button" type="button" aria-label="Open navigation menu">
        <img src="/assets/menu.png" alt="" aria-hidden="true" />
      </button>
    </nav>
  );
}
