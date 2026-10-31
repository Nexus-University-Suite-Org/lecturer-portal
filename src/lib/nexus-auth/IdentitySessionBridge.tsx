import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusAuth } from "./AuthProvider";

export function IdentitySessionBridge() {
  const { status, user, client, getAccessToken, logout } = useNexusAuth();
  const { signInWithSso } = useAuth();
  const syncing = useRef(false);
  const syncedIdentityToken = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      if (status !== "authenticated" || !user || syncing.current) {
        return;
      }
      syncing.current = true;
      try {
        const identityToken = await getAccessToken();
        if (!active || !identityToken || syncedIdentityToken.current === identityToken) {
          return;
        }

        const result = await signInWithSso(identityToken);
        if (!active) return;
        if (result.error) throw result.error;
        syncedIdentityToken.current = identityToken;
      } finally {
        syncing.current = false;
      }
    };

    const runSync = () => {
      void sync().catch((error: unknown) => {
        if (!active) return;
        syncedIdentityToken.current = null;
        console.error("Lecturer SSO could not be initialized", error);
        window.dispatchEvent(
          new CustomEvent("nexus-sso-error", {
            detail: error instanceof Error ? error.message : String(error),
          }),
        );
        localStorage.removeItem("nexus-auth-token");
        localStorage.removeItem("nexus-auth-user");
        localStorage.removeItem("nexus-auth-profile");
        void logout("/auth").catch((logoutError: unknown) =>
          console.error("Nexus Identity logout failed", logoutError),
        );
      });
    };

    runSync();
    const unsubscribe = client.subscribe(runSync);
    const handleSignout = () => {
      void logout("/auth").catch((error: unknown) =>
        console.error("Nexus Identity logout failed", error),
      );
    };
    window.addEventListener("nexus-sso-signout", handleSignout);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("nexus-sso-signout", handleSignout);
    };
  }, [client, getAccessToken, logout, signInWithSso, status, user]);

  return null;
}
