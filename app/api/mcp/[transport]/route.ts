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
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: false,
    disableSse: true,
  }
);

const authed = withMcpAuth(
  handler,
  async (_req, bearerToken) => {
    const expected = process.env.MCP_AUTH_TOKEN;
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
