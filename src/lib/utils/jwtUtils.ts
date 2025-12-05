import jwt from "jsonwebtoken";

/**
 * Generate a JWT token for AWS API Gateway authentication
 * @param companyId The company ID to include in the token
 * @param email Optional email address (defaults to a test email)
 * @returns A Bearer token string ready to use in Authorization header
 */
export function generateApiToken(
  companyId: string,
  email: string = "api@no-show-software.com"
): string {
  const jwtSecret = process.env.JWT_VERIFICATION_KEY;

  if (!jwtSecret) {
    throw new Error(
      "JWT_VERIFICATION_KEY environment variable is required to generate API tokens"
    );
  }

  const token = jwt.sign(
    {
      iss: "supabase",
      role: "authenticated",
      sub: "api-user",
      email: email,
      company_id: companyId,
    },
    jwtSecret,
    { expiresIn: "1h" }
  );

  return `Bearer ${token}`;
}
