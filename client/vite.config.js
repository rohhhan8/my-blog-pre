import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode`
  const env = loadEnv(mode, process.cwd(), '');
  
  // Log loaded environment variables (will show in terminal, not browser)
  console.log('Loaded environment variables:', {
    VITE_BACKEND_URL: env.VITE_BACKEND_URL,
    VITE_API_URL: env.VITE_API_URL,
    NODE_ENV: env.NODE_ENV,
    // Add other variables you want to check
  });
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});

