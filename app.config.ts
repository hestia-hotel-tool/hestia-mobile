import { ConfigContext, ExpoConfig } from "expo/config";

const EAS_PROJECT_ID = "812d1d0f-dd1e-4634-9ebc-c3a124ab1aa5";
const PROJECT_SLUG = "hestia";
const OWNER = "wallice-dev";
const VERSION = "1.0.1";

const APP_NAME = "Hestia";
const BUNDLE_IDENTIFIER = "com.hestiahotels.app";
const PACKAGE_NAME = "com.hestiahotels.app";
const ICON = "./assets/app/icon.png";
const ADAPTIVE_ICON = "./assets/app/adaptive-icon.png";
const SCHEME = "hestia";

export default ({ config }: ConfigContext): ExpoConfig => {
  console.log("⚙️ Building app for environment:", process.env.APP_ENV);

  const appEnv =
    (process.env.APP_ENV as "development" | "preview" | "production") ||
    "development";

  const { name, bundleIdentifier, icon, adaptiveIcon, packageName, scheme } =
    getDynamicAppConfig(appEnv);

  // iOS push entitlement: development → sandbox APNs; preview/production → production APNs (TestFlight / App Store).
  const iosPushMode: "development" | "production" =
    appEnv === "development" ? "development" : "production";

  return {
    ...config,
    name,
    version: VERSION,
    slug: PROJECT_SLUG,
    orientation: "portrait",
    userInterfaceStyle: "light",
    icon,
    scheme,
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier,
      icon,
      backgroundColor: "#FFFFFF",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSUserNotificationsUsageDescription:
          "Hestia sends notifications for room assignments, team chat, and ticket updates so you do not miss important work.",
      },
    },
    android: {
      icon,
      adaptiveIcon: {
        foregroundImage: adaptiveIcon,
        backgroundColor: "#FFFFFF",
      },
      package: packageName,
      softwareKeyboardLayoutMode: "resize",
    },
    web: {
      favicon: "./assets/app/favicon.png",
    },
    extra: {
      eas: {
        projectId: EAS_PROJECT_ID,
      },
      // Exposed to the JS runtime (process.env.APP_ENV is NOT inlined into the
      // app bundle). Read via Constants.expoConfig.extra.appEnv for debugging /
      // env-aware UI. Supabase credentials come from EXPO_PUBLIC_* env vars.
      appEnv,
    },
    owner: OWNER,
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    plugins: [
      "expo-font",
      "expo-asset",
      [
        "expo-router",
        {
          root: "./app",
        },
      ],
      "expo-audio",
      "expo-image",
      "expo-sharing",
      [
        "expo-splash-screen",
        {
          image: "./assets/app/splash-icon.png",
          imageWidth: 160,
          resizeMode: "contain",
          backgroundColor: "#EEF0F6",
          dark: { backgroundColor: "#EEF0F6" },
        },
      ],
      "expo-status-bar",
      [
        "expo-notifications",
        {
          mode: iosPushMode,
          // Must match `setNotificationChannelAsync('default', …)` so FCM/Expo push use HIGH importance + sound.
          defaultChannel: "default",
        },
      ],
    ],
  };
};

export const getDynamicAppConfig = (
  environment: "development" | "preview" | "production"
) => {
  if (environment === "production") {
    return {
      name: APP_NAME,
      bundleIdentifier: BUNDLE_IDENTIFIER,
      packageName: PACKAGE_NAME,
      icon: ICON,
      adaptiveIcon: ADAPTIVE_ICON,
      scheme: SCHEME,
    };
  }

  if (environment === "preview") {
    return {
      name: `${APP_NAME} Preview`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.preview`,
      packageName: `${PACKAGE_NAME}.preview`,
      icon: ICON,
      adaptiveIcon: ADAPTIVE_ICON,
      scheme: `${SCHEME}-preview`,
    };
  }

  return {
    name: `${APP_NAME} Development`,
    bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
    packageName: `${PACKAGE_NAME}.dev`,
    icon: ICON,
    adaptiveIcon: ADAPTIVE_ICON,
    scheme: `${SCHEME}-dev`,
  };
};
