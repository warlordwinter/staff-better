import { requireAuth, requireAuthWithSetup } from "@/lib/auth/utils";

interface ServerProtectedRouteProps {
  children: React.ReactNode;
  requireSetup?: boolean;
}

export async function ServerProtectedRoute({
  children,
  requireSetup = false,
}: ServerProtectedRouteProps) {
  try {
    if (requireSetup) {
      await requireAuthWithSetup();
    } else {
      await requireAuth();
    }

    return <>{children}</>;
  } catch (error) {
    // If there's an error (like redirect), let it bubble up
    throw error;
  }
}
