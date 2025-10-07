import { requireAuth } from "@/lib/auth/utils";
import { redirect } from "next/navigation";
import Image from "next/image";
import CompanySetupForm from "./CompanySetupForm";

export default async function CompanySetupPage() {
  // Ensure user is authenticated
  const user = await requireAuth();

  // Check if user has already completed setup
  const hasCompletedSetup =
    user.user_metadata?.company_setup_completed === true;

  if (hasCompletedSetup) {
    redirect("/jobs");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Image height={80} width={80} alt="Logo" src="/icons/logo.svg" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Staff Better
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please provide some information about your company
          </p>
        </div>

        <CompanySetupForm userEmail={user.email || ""} />
      </div>
    </div>
  );
}
