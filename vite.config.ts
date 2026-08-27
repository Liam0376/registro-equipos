import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

function stripCrossorigin(): Plugin {
  return {
    name: 'strip-crossorigin',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, '')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // singlefile inlines JS/CSS into index.html so the build can be opened
  // directly via file:// with no server and no npm install (los datos
  // quedan en caché local).
  plugins: [react(), tailwindcss(), viteSingleFile(), stripCrossorigin()],
  server: {
    host: true,
  },
})