import { useState, useEffect } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { graphConfig, ALLOWED_GROUP_ID } from './authConfig';

interface GroupCheckResult {
  isLoading: boolean;
  isAuthorized: boolean;
  error: string | null;
}

/**
 * Hook to check if the current user is a member of the allowed group.
 * If ALLOWED_GROUP_ID is not set, all authenticated users are authorized.
 */
export function useGroupAuthorization(): GroupCheckResult {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkGroupMembership() {
      // If no group restriction is configured, allow all authenticated users
      if (!ALLOWED_GROUP_ID) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Wait for authentication to complete
      if (inProgress !== InteractionStatus.None) {
        return;
      }

      if (!isAuthenticated || accounts.length === 0) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      try {
        // Get access token for Graph API
        const response = await instance.acquireTokenSilent({
          scopes: ['GroupMember.Read.All'],
          account: accounts[0],
        });

        // Check group membership via Graph API
        const graphResponse = await fetch(graphConfig.graphMemberOfEndpoint, {
          headers: {
            Authorization: `Bearer ${response.accessToken}`,
          },
        });

        if (!graphResponse.ok) {
          throw new Error('Failed to fetch group membership');
        }

        const data = await graphResponse.json();

        // Check if user is member of the allowed group
        const isMember = data.value?.some(
          (group: { id: string }) => group.id === ALLOWED_GROUP_ID
        );

        setIsAuthorized(isMember);

        if (!isMember) {
          setError('You are not authorized to access this application. Please contact an administrator.');
        }
      } catch (err) {
        console.error('Error checking group membership:', err);
        // If we can't check groups (e.g., permission denied), fall back to checking via token claims
        // This happens when the app is configured to include groups in the token
        try {
          const tokenClaims = accounts[0]?.idTokenClaims as { groups?: string[] } | undefined;
          if (tokenClaims?.groups?.includes(ALLOWED_GROUP_ID)) {
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
            setError('You are not authorized to access this application.');
          }
        } catch {
          setIsAuthorized(false);
          setError('Unable to verify group membership.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    checkGroupMembership();
  }, [instance, accounts, isAuthenticated, inProgress]);

  return { isLoading, isAuthorized, error };
}

