import type { NextConfig } from "next"
import path from "path"

const featuredropDist = path.resolve(__dirname, "../../dist")

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Resolve all featuredrop subpath imports to the local workspace build.
    // This ensures useChangelog is available from react barrel (not yet
    // published to npm) and avoids context duplication between react and
    // react-hooks entry points.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "featuredrop/react/hooks": path.join(featuredropDist, "react.js"),
      "featuredrop/react": path.join(featuredropDist, "react.js"),
      "featuredrop/adapters": path.join(featuredropDist, "adapters.js"),
      featuredrop: path.join(featuredropDist, "index.js"),
    }

    // featuredrop bundles some Node-only code paths (module, fs) that
    // are never executed in the browser. Tell webpack to ignore them.
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      module: false,
      "fs/promises": false,
    }
    return config
  },
}

export default nextConfig
