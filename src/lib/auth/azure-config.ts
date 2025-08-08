export const AZURE_OAUTH_CONFIG = {
  // Azure App Registration settings
  clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
  tenantId: process.env.NEXT_PUBLIC_AZURE_TENANT_ID!,
  
  // Supabase OAuth settings
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  
  // Redirect URLs
  redirectUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`,
  
  // Scopes for Azure AD
  scopes: ['openid', 'profile', 'email'],
};

export const getAzureAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: AZURE_OAUTH_CONFIG.clientId,
    response_type: 'code',
    redirect_uri: AZURE_OAUTH_CONFIG.redirectUrl,
    scope: AZURE_OAUTH_CONFIG.scopes.join(' '),
    response_mode: 'query',
  });
  
  return `https://login.microsoftonline.com/${AZURE_OAUTH_CONFIG.tenantId}/oauth2/v2.0/authorize?${params}`;
}; 