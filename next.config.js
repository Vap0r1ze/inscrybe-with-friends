/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['cdn.discordapp.com'],
    },
    reactStrictMode: true,
    webpack: (config) => {
        config.module.rules.push({
            test: /\.lua$/,
            use: 'raw-loader',
        });
        return config;
    },
};

module.exports = nextConfig;
