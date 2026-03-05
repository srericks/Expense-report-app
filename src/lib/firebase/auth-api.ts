import { cookies } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { serverConfig } from "@/lib/firebase/config";

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const tokens = await getTokens(cookieStore, {
    apiKey: serverConfig.firebaseApiKey,
    cookieName: serverConfig.cookieName,
    cookieSignatureKeys: serverConfig.cookieSignatureKeys,
    serviceAccount: serverConfig.serviceAccount,
  });

  if (!tokens) return null;
  return tokens.decodedToken;
}
