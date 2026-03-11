// import { defineConfig } from 'vite';

// export default defineConfig({
//   base: './',
//   build: {
//     outDir: 'dist',
//   },
//   server: {
//     port: 3000,
//   }
// });

import { defineConfig } from 'vite';

export default defineConfig({
  base: '/3d-game/',  // имя твоего репозитория на GitHub
  build: {
    outDir: 'dist',
  },  
  server: {
    port: 3000,
  }
});