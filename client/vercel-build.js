// This is a simple script to ensure proper permissions for Vercel builds
import { execSync } from 'child_process';

try {
  // Make vite executable
  execSync('chmod +x ./node_modules/.bin/vite', { stdio: 'inherit' });

  // Run the build
  execSync('vite build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
