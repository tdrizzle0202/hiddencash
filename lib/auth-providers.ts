import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// Required for web browser auth flow
WebBrowser.maybeCompleteAuthSession();

/**
 * Check if Apple Sign In is available (iOS 13+ only)
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return false;
  }
  return await AppleAuthentication.isAvailableAsync();
}

/**
 * Sign in with Apple (iOS only)
 * Native Face ID / Touch ID experience with nonce for security
 */
export async function signInWithApple() {
  try {
    // Generate nonce for security
    const nonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonce
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error("No identity token received from Apple");
    }

    // Send token to Supabase with original nonce
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: nonce,
    });

    if (error) throw error;

    // Apple only provides name on first sign-in, save it
    if (credential.fullName?.givenName || credential.fullName?.familyName) {
      const fullName = [
        credential.fullName.givenName,
        credential.fullName.familyName,
      ]
        .filter(Boolean)
        .join(" ");

      if (fullName && data.user) {
        await supabase.auth.updateUser({
          data: { full_name: fullName },
        });
      }
    }

    return data;
  } catch (error: any) {
    if (error.code === "ERR_REQUEST_CANCELED") {
      return null; // User cancelled
    }
    throw error;
  }
}

/**
 * Sign in with Google (iOS + Android)
 * Opens browser for OAuth flow
 */
export async function signInWithGoogle() {
  try {
    const redirectUri = makeRedirectUri({
      scheme: "hiddencash",
      path: "auth/callback",
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    if (data.url) {
      // Open Google sign-in in browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === "success") {
        // Extract tokens from URL
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken) {
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });

          if (sessionError) throw sessionError;
          return sessionData;
        }
      }
    }

    return null;
  } catch (error) {
    throw error;
  }
}
