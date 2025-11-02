// app/template.tsx
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import AuthHydrator from "@/components/AuthHydrator";

export default async function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  // kunin natin yung totoong user na nakikita ng server
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <AuthHydrator
        serverUserId={user?.id ?? null}
        accessToken={session?.access_token ?? null}
        refreshToken={session?.refresh_token ?? null}
      />
      {children}
    </>
  );
}
