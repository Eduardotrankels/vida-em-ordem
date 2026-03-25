import Constants from "expo-constants";

type GoogleSigninModule = typeof import("@react-native-google-signin/google-signin");

type GoogleAuthConfig = {
  webClientId: string;
  androidClientId: string;
  iosClientId: string;
};

let configuredSignature = "";

export function isExpoGoRuntime() {
  return Constants.appOwnership === "expo";
}

export function getGoogleAuthConfig(): GoogleAuthConfig {
  const extra = (Constants.expoConfig?.extra || {}) as {
    googleAuth?: {
      webClientId?: string;
      androidClientId?: string;
      iosClientId?: string;
    };
  };

  return {
    webClientId: extra.googleAuth?.webClientId || "",
    androidClientId: extra.googleAuth?.androidClientId || "",
    iosClientId: extra.googleAuth?.iosClientId || "",
  };
}

export function getGoogleNativeModule(): GoogleSigninModule | null {
  if (isExpoGoRuntime()) {
    return null;
  }

  try {
    // Native module must be loaded lazily so Expo Go does not crash at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@react-native-google-signin/google-signin") as GoogleSigninModule;
  } catch (error) {
    console.log("Modulo nativo do Google Sign-In indisponivel:", error);
    return null;
  }
}

export function configureGoogleNativeSignIn() {
  const googleModule = getGoogleNativeModule();
  const config = getGoogleAuthConfig();

  if (!googleModule || !config.webClientId) {
    return {
      googleModule,
      config,
      isConfigured: false,
    };
  }

  const signature = JSON.stringify({
    webClientId: config.webClientId,
    iosClientId: config.iosClientId,
  });

  if (configuredSignature !== signature) {
    googleModule.GoogleSignin.configure({
      webClientId: config.webClientId,
      iosClientId: config.iosClientId || undefined,
      scopes: ["email", "profile"],
      profileImageSize: 180,
      offlineAccess: false,
    });
    configuredSignature = signature;
  }

  return {
    googleModule,
    config,
    isConfigured: true,
  };
}

export async function resetGoogleNativeSignInSession() {
  const googleModule = getGoogleNativeModule();

  if (!googleModule) {
    return;
  }

  try {
    if (googleModule.GoogleSignin.hasPreviousSignIn()) {
      await googleModule.GoogleSignin.signOut();
    }
  } catch (error) {
    console.log("Erro ao encerrar sessao local do Google:", error);
  }

  try {
    await googleModule.GoogleSignin.revokeAccess();
  } catch (error) {
    console.log("Erro ao revogar acesso do Google no dispositivo:", error);
  }
}
