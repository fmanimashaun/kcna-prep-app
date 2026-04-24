import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set via env when building for GitHub Pages (e.g. VITE_BASE=/kcna-prep-app/)
// Leave unset for local dev and previews.
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
