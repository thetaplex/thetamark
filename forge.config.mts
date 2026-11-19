import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'ThetaMark',
    // macOS shows this as the app's display name; elsewhere keep a lowercase binary name.
    executableName: process.platform === 'darwin' ? 'ThetaMark' : 'thetamark',
    appBundleId: 'dev.thetaplex.thetamark',
    // macOS "Open With" for Markdown files.
    extendInfo: {
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'Markdown document',
          CFBundleTypeRole: 'Editor',
          LSHandlerRank: 'Alternate',
          LSItemContentTypes: ['net.daringfireball.markdown', 'public.plain-text'],
          CFBundleTypeExtensions: ['md', 'markdown', 'mdown', 'mkd'],
        },
      ],
    },
  },
  rebuildConfig: {},
  hooks: {
    // Packaging edits Info.plist and flips fuses after Electron's ad-hoc signature, which
    // invalidates it: macOS then calls the download "damaged". Re-sign the whole bundle ad hoc.
    // ponytail: ad hoc still needs "Open Anyway" once; Developer ID + notarization removes that.
    postPackage: async (_config, { platform, outputPaths }) => {
      if (platform !== 'darwin') return;
      for (const dir of outputPaths) {
        execFileSync('codesign', ['--force', '--deep', '--sign', '-', join(dir, 'ThetaMark.app')]);
      }
    },
  },
  makers: [
    new MakerSquirrel({ authors: 'ThetaPlex', description: 'ThetaMark by ThetaPlex' }),
    new MakerDMG({}),
    new MakerZIP({}, ['darwin', 'linux']),
    new MakerDeb({ options: { mimeType: ['text/markdown'], categories: ['Office', 'Utility'] } }),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
