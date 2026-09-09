import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local-only app: no backend proxy. All data stays on device
// (Capacitor Preferences + localStorage).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    // Split the 972 kB monolith into logical chunks (#15).
    // Vendor QR / DOMPurify are large and rarely change — isolate them.
    rollupOptions: {
      output: {
        manualChunks: {
          // Capacitor native bridge (stays the same across app updates)
          vendor_capacitor: ['@capacitor/core', '@capacitor/preferences'],
          // QR code generator is large and infrequently used
          vendor_qr: ['qrcode'],
          // DOMPurify (HTML sanitiser for payslip renderer)
          vendor_purify: ['dompurify'],
          // Core React runtime
          vendor_react: ['react', 'react-dom'],
          // Lucide icon tree (large but tree-shakeable across one chunk)
          vendor_icons: ['lucide-react'],
        },
      },
    },
    // Raise the warning threshold from 500 kB to 600 kB until lazy loading
    // is wired up for the payslip/reports routes.
    chunkSizeWarningLimit: 600,
  },
});
