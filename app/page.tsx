import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { LandingPage } from "./landing";
import { RecorderHome } from "./recorder";

export default async function HomePage() {
  // Check if user is authenticated (not anonymous)
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let isAuthenticated = false;

  if (url && anon) {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* read-only in server component */ },
      },
    });
    const { data } = await supabase.auth.getUser();
    isAuthenticated = !!data.user && data.user.is_anonymous !== true && !!data.user.email;
  }

  if (isAuthenticated) {
    return <RecorderHome />;
  }

  return <LandingPage />;
}
