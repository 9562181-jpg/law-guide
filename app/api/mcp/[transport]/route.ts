import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { registerLawTools } from "@/lib/mcp/law-mcp-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const AUTHKIT_DOMAIN = process.env.WORKOS_AUTHKIT_DOMAIN;
const MCP_RESOURCE_URL =
  process.env.MCP_RESOURCE_URL ?? "https://law-guide-ten.vercel.app/api/mcp/mcp";

if (!AUTHKIT_DOMAIN) {
  throw new Error("WORKOS_AUTHKIT_DOMAIN env var is required");
}

const JWKS = createRemoteJWKSet(new URL(`${AUTHKIT_DOMAIN}/oauth2/jwks`));

const handler = createMcpHandler(
  (server) => {
    registerLawTools(server);
  },
  {
    serverInfo: {
      name: "korea-law-mcp",
      version: "1.0.0",
    },
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: false,
    disableSse: true,
  }
);

const authed = withMcpAuth(
  handler,
  async (_req, bearerToken) => {
    if (!bearerToken) return undefined;
    try {
      const { payload } = await jwtVerify(bearerToken, JWKS, {
        issuer: AUTHKIT_DOMAIN,
        audience: MCP_RESOURCE_URL,
      });
      return {
        token: bearerToken,
        clientId:
          typeof payload.client_id === "string" ? payload.client_id : "unknown",
        scopes:
          typeof payload.scope === "string" ? payload.scope.split(" ") : [],
        extra: {
          sub: typeof payload.sub === "string" ? payload.sub : undefined,
        },
      };
    } catch (err) {
      console.warn(
        "[MCP Auth] JWT verification failed:",
        err instanceof Error ? err.message : String(err)
      );
      return undefined;
    }
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
  }
);

export { authed as GET, authed as POST, authed as DELETE };
