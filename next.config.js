/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['cdn.discordapp.com'],
    },
    reactStrictMode: true,
    productionBrowserSourceMaps: true,
};

module.exports = nextConfig;
