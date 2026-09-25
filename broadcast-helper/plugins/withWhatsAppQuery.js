// Android 11+ hides other apps from Linking.canOpenURL unless the manifest declares them
// in <queries>. This plugin adds WhatsApp (personal + Business) and the whatsapp:// scheme
// so the "is WhatsApp installed?" check works in standalone/dev builds.
// (Expo Go uses its own manifest, so there the app falls back to wa.me links when needed.)
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withWhatsAppQuery(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries || [];
    manifest.queries.push({
      package: [
        { $: { 'android:name': 'com.whatsapp' } },
        { $: { 'android:name': 'com.whatsapp.w4b' } },
      ],
      intent: [
        {
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          data: [{ $: { 'android:scheme': 'whatsapp' } }],
        },
      ],
    });
    return cfg;
  });
};
