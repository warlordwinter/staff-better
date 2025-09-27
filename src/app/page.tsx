import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const params = await searchParams;

  // Handle OAuth callback if code is present
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}`);
  }

  if (params.error) {
    redirect(`/auth/callback?error=${params.error}`);
  }

  // Default redirect to landing page
  redirect("/landingpage");
}
