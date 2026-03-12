import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Closer',
    short_name: 'Closer',
    description: 'Votre espace privé à deux',
    start_url: '/',
    display: 'standalone',
    background_color: '#FDF8F5',
    theme_color: '#F43F5E',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
