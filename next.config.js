/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // public URLs
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
      // signed URLs (private buckets)
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/sign/**' },

      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      // Unsplash
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

module.exports = nextConfig;
