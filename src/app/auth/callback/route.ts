import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const oauthDescription = searchParams.get("error_description");

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(oauthDescription || oauthError)}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_superadmin")
          .eq("id", user.id)
          .maybeSingle();

        const next = profile?.is_superadmin ? "/" : "/forbidden";
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`);
        }
        if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        }
        return NextResponse.redirect(`${origin}${next}`);
      }
    } else {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Missing auth code")}`,
  );
}
