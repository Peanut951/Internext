import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import authHandler from "./api/auth";
import resellerApplicationHandler from "./api/reseller-application";

const readRequestBody = async (req: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
};

const devAuthApiPlugin = (): Plugin => {
  const handlers = {
    "/api/auth": authHandler,
    "/api/reseller-application": resellerApplicationHandler,
  } as const;

  return {
    name: "internext-dev-auth-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url || "", "http://localhost");
        const pathname = requestUrl.pathname;
        const handler = handlers[pathname as keyof typeof handlers];

        if (!handler) {
          return next();
        }

        try {
          const body =
            req.method === "POST" || req.method === "PUT" || req.method === "PATCH"
              ? await readRequestBody(req)
              : undefined;

          await handler(
            {
              method: req.method,
              headers: {
                cookie: req.headers.cookie,
              },
              query: Object.fromEntries(requestUrl.searchParams.entries()),
              body,
            },
            res,
          );
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              message:
                error instanceof Error ? error.message : "Dev auth middleware failed.",
            }),
          );
        }
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), devAuthApiPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
