import { redirect } from "next/navigation";

export default function Home({
  searchParams,
}: {
  searchParams: { code?: string; error?: string };
}) {
  // Handle OAuth callback if code is present
  if (searchParams.code) {
    redirect(`/auth/callback?code=${searchParams.code}`);
  }

  if (searchParams.error) {
    redirect(`/auth/callback?error=${searchParams.error}`);
  }

  // Default redirect to landing page
  redirect("/landingpage");
}
