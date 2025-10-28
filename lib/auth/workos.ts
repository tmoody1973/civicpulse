import { WorkOS } from '@workos-inc/node';

// Initialize WorkOS client (validate API key at runtime)
function getWorkOS() {
  const apiKey = process.env.WORKOS_API_KEY;
  if (!apiKey) {
    throw new Error('WORKOS_API_KEY is not set');
  }
  return new WorkOS(apiKey);
}

// Get WorkOS environment variables (validate at runtime)
function getClientId() {
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) {
    throw new Error('WORKOS_CLIENT_ID is not set');
  }
  return clientId;
}

function getRedirectUri() {
  const redirectUri = process.env.WORKOS_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error('WORKOS_REDIRECT_URI is not set');
  }
  return redirectUri;
}

/**
 * Get authorization URL for OAuth provider
 * @param provider 'GoogleOAuth' or 'GitHubOAuth' (WorkOS provider names)
 * @param state Optional state parameter for CSRF protection
 * @returns Authorization URL to redirect user to
 */
export function getAuthorizationUrl(
  provider: 'GoogleOAuth' | 'GitHubOAuth',
  state?: string
): string {
  const workos = getWorkOS();
  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    provider,
    clientId: getClientId(),
    redirectUri: getRedirectUri(),
    state,
  });

  return authorizationUrl;
}

/**
 * Authenticate user with authorization code from OAuth callback
 * @param code Authorization code from OAuth provider
 * @returns User profile information
 */
export async function authenticateWithCode(code: string) {
  const workos = getWorkOS();
  const { user, accessToken, refreshToken } = await workos.userManagement.authenticateWithCode({
    clientId: getClientId(),
    code,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePictureUrl: user.profilePictureUrl,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Get user info from access token
 * Note: WorkOS User Management doesn't expose user info via access token
 * Instead, we'll store user info in our database and look it up from there
 * @param accessToken User's access token (used for validation only)
 * @returns User ID from token validation
 */
export async function verifyAccessToken(accessToken: string): Promise<string | null> {
  try {
    const workos = getWorkOS();
    // The access token is a JWT - we can decode it to get the user ID
    // Or we can store it and validate it later
    // For now, we'll just return null and rely on database lookups
    return null;
  } catch (error) {
    console.error('Failed to verify access token:', error);
    return null;
  }
}

/**
 * Refresh access token
 * @param refreshToken User's refresh token
 * @returns New access token and refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  const workos = getWorkOS();
  const response = await workos.userManagement.authenticateWithRefreshToken({
    clientId: getClientId(),
    refreshToken,
  });

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  };
}

/**
 * Create a new user with email and password
 * @param email User's email address
 * @param password User's password
 * @param firstName Optional first name
 * @param lastName Optional last name
 * @returns Created user information
 */
export async function createUserWithPassword(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string
) {
  const workos = getWorkOS();
  const user = await workos.userManagement.createUser({
    email,
    password,
    firstName,
    lastName,
    emailVerified: false, // Require email verification
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: user.emailVerified,
  };
}

/**
 * Authenticate user with email and password
 * @param email User's email address
 * @param password User's password
 * @returns User profile and tokens
 */
export async function authenticateWithPassword(email: string, password: string) {
  const workos = getWorkOS();
  const { user, accessToken, refreshToken } = await workos.userManagement.authenticateWithPassword({
    clientId: getClientId(),
    email,
    password,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePictureUrl: user.profilePictureUrl,
      emailVerified: user.emailVerified,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Send password reset email
 * @param email User's email address
 */
export async function sendPasswordResetEmail(email: string) {
  const workos = getWorkOS();
  await workos.userManagement.sendPasswordResetEmail({
    email,
    passwordResetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });
}

/**
 * Reset password with token
 * @param token Password reset token from email
 * @param newPassword New password
 */
export async function resetPassword(token: string, newPassword: string) {
  const workos = getWorkOS();
  await workos.userManagement.resetPassword({
    token,
    newPassword,
  });
}

/**
 * Send email verification
 * @param userId User ID
 */
export async function sendVerificationEmail(userId: string) {
  const workos = getWorkOS();
  await workos.userManagement.sendVerificationEmail({
    userId,
  });
}
