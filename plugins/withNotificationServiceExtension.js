/**
 * Adds the iOS Notification Service Extension that gives Hestia pushes their
 * lock-screen picture (Figma 4443:595) — see notification-service/NotificationService.swift.
 *
 * The native projects are generated (`expo prebuild`; /ios is not committed),
 * so this plugin does what Xcode's "New Target → Notification Service
 * Extension" would, on every prebuild:
 *
 *  - copies notification-service/ (Swift, Info.plist, images/) into ios/<target>/
 *  - adds the app-extension target, embedded in the app, with its own bundle id
 *    (<app id>.NotificationService), the app's deployment target and versions
 *  - gives the app the Communication Notifications entitlement and declares
 *    INSendMessageIntent, which iOS requires before it draws the picture
 *
 * Signing: in Xcode (Automatic), the extension uses the app's team — set
 * `ios.appleTeamId` in app.config.ts to have prebuild fill it in for both
 * targets, or pick the team on the HestiaNotificationService target once.
 * EAS builds sign it through `extra.eas.build.experimental.ios.appExtensions`.
 */
const fs = require('fs');
const path = require('path');
const {
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} = require('@expo/config-plugins');

const TARGET = 'HestiaNotificationService';
const SOURCE = path.join(__dirname, 'notification-service');

function listImages() {
  const dir = path.join(SOURCE, 'images');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort() : [];
}

function withExtensionFiles(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const dest = path.join(cfg.modRequest.platformProjectRoot, TARGET);
      fs.mkdirSync(path.join(dest, 'images'), { recursive: true });
      for (const file of ['NotificationService.swift', 'Info.plist']) {
        fs.copyFileSync(path.join(SOURCE, file), path.join(dest, file));
      }
      for (const image of listImages()) {
        fs.copyFileSync(path.join(SOURCE, 'images', image), path.join(dest, 'images', image));
      }
      return cfg;
    },
  ]);
}

/** The main app target's build settings (first configuration that has them). */
function mainBuildSettings(project) {
  const configs = project.pbxXCBuildConfigurationSection();
  for (const key of Object.keys(configs)) {
    const settings = configs[key] && configs[key].buildSettings;
    if (settings && settings.PRODUCT_BUNDLE_IDENTIFIER && !String(settings.PRODUCT_BUNDLE_IDENTIFIER).includes(TARGET)) {
      return settings;
    }
  }
  return {};
}

function withExtensionTarget(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    if (project.pbxTargetByName(TARGET)) return cfg; // already added (re-run prebuild)

    const appId = cfg.ios && cfg.ios.bundleIdentifier;
    if (!appId) throw new Error('[withNotificationServiceExtension] ios.bundleIdentifier is required');
    const main = mainBuildSettings(project);
    const images = listImages().map((f) => `images/${f}`);

    // Group with the extension's files, under the project's main group.
    const group = project.addPbxGroup(['NotificationService.swift', 'Info.plist', ...images], TARGET, TARGET);
    const mainGroupId = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(group.uuid, mainGroupId);

    const target = project.addTarget(TARGET, 'app_extension', TARGET, `${appId}.NotificationService`);
    project.addBuildPhase(['NotificationService.swift'], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    project.addBuildPhase(images, 'PBXResourcesBuildPhase', 'Resources', target.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);

    // Build settings for both of the extension's configurations.
    const configs = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configs)) {
      const buildSettings = configs[key] && configs[key].buildSettings;
      if (!buildSettings || buildSettings.PRODUCT_NAME !== `"${TARGET}"`) continue;
      Object.assign(buildSettings, {
        INFOPLIST_FILE: `${TARGET}/Info.plist`,
        PRODUCT_BUNDLE_IDENTIFIER: `"${appId}.NotificationService"`,
        IPHONEOS_DEPLOYMENT_TARGET: main.IPHONEOS_DEPLOYMENT_TARGET || '16.4',
        MARKETING_VERSION: main.MARKETING_VERSION || `"${cfg.version || '1.0.0'}"`,
        CURRENT_PROJECT_VERSION: main.CURRENT_PROJECT_VERSION || (cfg.ios && cfg.ios.buildNumber) || '1',
        SWIFT_VERSION: '5.0',
        TARGETED_DEVICE_FAMILY: main.TARGETED_DEVICE_FAMILY || '"1,2"',
        CODE_SIGN_STYLE: 'Automatic',
        GENERATE_INFOPLIST_FILE: 'NO',
        SKIP_INSTALL: 'YES',
        CLANG_ENABLE_MODULES: 'YES',
        // The app's team, so Xcode signs the extension like the app: from the
        // main target, or `ios.appleTeamId` in app.config.ts.
        ...(main.DEVELOPMENT_TEAM || (cfg.ios && cfg.ios.appleTeamId)
          ? { DEVELOPMENT_TEAM: main.DEVELOPMENT_TEAM || cfg.ios.appleTeamId }
          : {}),
      });
    }
    return cfg;
  });
}

function withCommunicationEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.usernotifications.communication'] = true;
    return cfg;
  });
}

function withMessageIntent(config) {
  return withInfoPlist(config, (cfg) => {
    const types = new Set(cfg.modResults.NSUserActivityTypes || []);
    types.add('INSendMessageIntent');
    cfg.modResults.NSUserActivityTypes = [...types];
    return cfg;
  });
}

module.exports = function withNotificationServiceExtension(config) {
  config = withCommunicationEntitlement(config);
  config = withMessageIntent(config);
  config = withExtensionFiles(config);
  config = withExtensionTarget(config);
  return config;
};
