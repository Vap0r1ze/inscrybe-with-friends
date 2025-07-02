/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['cdn.discordapp.com'],
    },
    reactStrictMode: true,

    transpilePackages: ['next-auth'],
    webpack: (config, { isServer }) => {
        config.module.rules.push({
            test: /\.lua$/,
            use: 'raw-loader',
        });

        if (isServer) {
            config.devtool = 'source-map';
        }

        return config;
    },
    turbopack: {
        rules: {
            '*.lua': {
                loaders: ['raw-loader'],
                as: '*.js',
            },
        },
    },
};

module.exports = nextConfig;
