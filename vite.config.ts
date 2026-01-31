import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { componentTagger } from "lovable-tagger"
import vitePluginBundleObfuscator from "vite-plugin-bundle-obfuscator"

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Ofuscação (apenas build de produção)
    mode === 'production' &&
      vitePluginBundleObfuscator({
        autoExcludeNodeModules: true,
        // Perfil: "Médio" (equilíbrio entre proteção e risco de quebrar runtime)
        options: {
          compact: true,
          stringArray: true,
          stringArrayThreshold: 0.75,
          stringArrayShuffle: true,
          rotateStringArray: true,
          stringArrayWrappersCount: 1,
          stringArrayWrappersChainedCalls: true,
          stringArrayWrappersParametersMaxCount: 2,
          stringArrayWrappersType: 'variable',
          identifierNamesGenerator: 'hexadecimal',
          controlFlowFlattening: false,
          deadCodeInjection: false,
          selfDefending: true,
          disableConsoleOutput: false,
          debugProtection: false,
          renameGlobals: false,
        },
      }),
  ].filter(Boolean),
  server: {
    host: "::",
    port: 8080,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
  }
}))
