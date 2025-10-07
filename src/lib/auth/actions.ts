"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    redirect("/auth/auth-code-error");
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signInWithAzure() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      scopes: "openid profile email",
    },
  });

  if (error) {
    redirect("/auth/auth-code-error");
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect("/auth/auth-code-error");
  }

  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export async function checkUserSetupStatus() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { hasCompletedSetup: false, user: null };
  }

  // Check if user has completed company setup
  const hasCompletedSetup =
    user.user_metadata?.company_setup_completed === true;

  return { hasCompletedSetup, user };
}

export async function markSetupComplete() {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    data: {
      company_setup_completed: true,
    },
  });

  if (error) {
    throw new Error(`Failed to mark setup as complete: ${error.message}`);
  }

  revalidatePath("/", "layout");
}
