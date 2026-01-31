#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { GraphQLClient } from "graphql-request";
import { Handlers } from "./handlers.js";

const AHA_API_TOKEN = process.env.AHA_API_TOKEN;
const AHA_DOMAIN = process.env.AHA_DOMAIN;

if (!AHA_API_TOKEN) {
  throw new Error("AHA_API_TOKEN environment variable is required");
}

if (!AHA_DOMAIN) {
  throw new Error("AHA_DOMAIN environment variable is required");
}

const client = new GraphQLClient(
  `https://${AHA_DOMAIN}.aha.io/api/v2/graphql`,
  {
    headers: {
      Authorization: `Bearer ${AHA_API_TOKEN}`,
    },
  }
);

class AhaMcp {
  private server: Server;
  private handlers: Handlers;

  constructor() {
    this.server = new Server(
      {
        name: "aha-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.handlers = new Handlers(client);
    this.setupToolHandlers();

    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_record",
          description: "Get an Aha! feature or requirement by reference number",
          inputSchema: {
            type: "object",
            properties: {
              reference: {
                type: "string",
                description:
                  "Reference number (e.g., DEVELOP-123 or ADT-123-1)",
              },
            },
            required: ["reference"],
          },
        },
        {
          name: "get_page",
          description:
            "Get an Aha! page by reference number with optional relationships",
          inputSchema: {
            type: "object",
            properties: {
              reference: {
                type: "string",
                description: "Reference number (e.g., ABC-N-213)",
              },
              includeParent: {
                type: "boolean",
                description: "Include parent page in the response",
                default: false,
              },
            },
            required: ["reference"],
          },
        },
        {
          name: "search_documents",
          description: "Search for Aha! documents",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query string",
              },
              searchableType: {
                type: "string",
                description: "Type of document to search for (e.g., Page)",
                default: "Page",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "introspect_feature",
          description: "Introspect the Feature type schema to see available fields",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
        {
          name: "get_record_rest",
          description: "Get an Aha! feature using the REST API (for debugging custom fields)",
          inputSchema: {
            type: "object",
            properties: {
              reference: {
                type: "string",
                description: "Reference number (e.g., DEVELOP-123)",
              },
            },
            required: ["reference"],
          },
        },
        {
          name: "list_features_in_release",
          description: "List all features in a release",
          inputSchema: {
            type: "object",
            properties: {
              releaseReference: {
                type: "string",
                description: "Release reference number (e.g., ACT-R-14 or ACTIVATION-R-14)",
              },
              perPage: {
                type: "number",
                description: "Number of features per page (default 100, max 200)",
                default: 100,
              },
            },
            required: ["releaseReference"],
          },
        },
        {
          name: "update_feature",
          description: "Update a feature's fields including custom fields. Custom fields use their API key (e.g., 'go_live_date' for Release target date). Date format: YYYY-MM-DD",
          inputSchema: {
            type: "object",
            properties: {
              reference: {
                type: "string",
                description: "Feature reference number (e.g., ACTIVATION-59)",
              },
              fields: {
                type: "object",
                description: "Object containing field keys and values to update. Standard fields: name, workflow_kind, workflow_status, release, description, assigned_to_user, tags, start_date, due_date, initiative, epic, progress_source, progress, team. Custom fields use their API key (e.g., go_live_date, release_stage). Dates must be in YYYY-MM-DD format.",
              },
            },
            required: ["reference", "fields"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "get_record") {
        return this.handlers.handleGetRecord(request);
      } else if (request.params.name === "get_page") {
        return this.handlers.handleGetPage(request);
      } else if (request.params.name === "search_documents") {
        return this.handlers.handleSearchDocuments(request);
      } else if (request.params.name === "introspect_feature") {
        return this.handlers.handleIntrospectFeature();
      } else if (request.params.name === "get_record_rest") {
        return this.handlers.handleGetRecordRest(request);
      } else if (request.params.name === "list_features_in_release") {
        return this.handlers.handleListFeaturesInRelease(request);
      } else if (request.params.name === "update_feature") {
        return this.handlers.handleUpdateFeature(request);
      }

      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Aha! MCP server running on stdio");
  }
}

const server = new AhaMcp();
server.run().catch(console.error);
