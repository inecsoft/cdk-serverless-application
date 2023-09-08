// To enable the react-refresh plugin, we can optionally add a vite.config.ts file in the root of our project with the following code
import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh()],
});
