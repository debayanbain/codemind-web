import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app has its own package-lock.json alongside the root Nest monorepo's —
  // pin the tracing root so Next doesn't guess wrong between the two.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
