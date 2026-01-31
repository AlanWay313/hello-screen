declare module "vite-plugin-bundle-obfuscator" {
  import type { Plugin } from "vite";

  export interface BundleObfuscatorOptions {
    autoExcludeNodeModules?: boolean;
    /** Options forwarded to javascript-obfuscator */
    options?: Record<string, unknown>;
  }

  export default function vitePluginBundleObfuscator(
    options?: BundleObfuscatorOptions,
  ): Plugin;
}
