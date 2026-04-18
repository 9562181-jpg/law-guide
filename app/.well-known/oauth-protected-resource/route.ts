import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from "mcp-handler";

export const runtime = "nodejs";

const AUTHKIT_DOMAIN = process.env.WORKOS_AUTHKIT_DOMAIN;
const MCP_RESOURCE_URL =
  process.env.MCP_RESOURCE_URL ?? "https://law-guide-ten.vercel.app/api/mcp/mcp";

if (!AUTHKIT_DOMAIN) {
  throw new Error("WORKOS_AUTHKIT_DOMAIN env var is required");
}

export const GET = protectedResourceHandler({
  authServerUrls: [AUTHKIT_DOMAIN],
  resourceUrl: MCP_RESOURCE_URL,
});

export const OPTIONS = metadataCorsOptionsRequestHandler();
