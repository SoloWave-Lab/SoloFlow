import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  ssr: {
    noExternal: ['lucide-react'],
    // Externalize server-only Node.js modules
    external: ['pg', 'fs', 'path', 'crypto', 'net', 'tls', 'dns', 'util'],
  },
  optimizeDeps: {
    exclude: ['pg', 'dotenv'],
  },
  build: {
    rollupOptions: {
      external: ['pg', 'fs', 'path', 'crypto', 'net', 'tls', 'dns', 'util'],
    },
  },
});
