import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerLawTools } from "@/lib/mcp/law-mcp-server";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: false,
    disableSse: true,
  }
);

const authed = withMcpAuth(
  handler,
  async (_req, bearerToken) => {
    const expected = process.env.MCP_AUTH_TOKEN;
    // TEMP DEBUG: 민감값 노출 없이 존재·길이·일치만 로그
    console.log(
      `[MCP Auth] env.MCP_AUTH_TOKEN=${expected ? `set(len=${expected.length})` : "MISSING"} ` +
        `bearer=${bearerToken ? `set(len=${bearerToken.length})` : "MISSING"} ` +
        `match=${bearerToken === expected}`
    );
    if (!expected || !bearerToken) return undefined;
    if (bearerToken !== expected) return undefined;
    return {
      token: bearerToken,
      clientId: "law-guide",
      scopes: [],
    };
  },
  { required: true }
);

export { authed as GET, authed as POST, authed as DELETE };
