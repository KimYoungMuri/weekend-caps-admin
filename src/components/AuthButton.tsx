"use client";

import { createClient } from "@/lib/supabase/client";

export function SignInWithGoogleButton() {
  async function handleSignIn() {
    const supabase = createClient();
    const origin = window.location.origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      window.location.href = `/login?error=${encodeURIComponent(error.message)}`;
      return;
    }

    if (data.url) {
      window.location.href = data.url;
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
    >
      Sign in with Google
    </button>
  );
}

export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        Sign out
      </button>
    </form>
  );
}
