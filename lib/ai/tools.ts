/**
 * AI SDK v6 tool definitions for the chat route.
 * Uses inputSchema (not parameters) per AI SDK v6 conventions.
 */

import { z } from "zod";
import { tool } from "ai";

export const allTools = {
  searchDocuments: tool({
    description: "Search the knowledge base for relevant documents.",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
    }),
    execute: async ({ query }) => {
      // Mock implementation -- replace with real search
      return {
        results: [
          {
            title: `Result for "${query}"`,
            snippet: "This is a mock search result. Connect a real knowledge base for production use.",
            relevance: 0.95,
          },
        ],
      };
    },
  }),

  askQuestion: tool({
    description:
      "Ask the user a multiple-choice question to gather more information.",
    inputSchema: z.object({
      question: z.string().describe("The question to ask"),
      options: z
        .array(z.string())
        .min(2)
        .max(5)
        .describe("The answer options"),
    }),
    // No execute -- this is a client-side tool
  }),

  updateSettings: tool({
    description: "Update a configuration value in user settings.",
    inputSchema: z.object({
      key: z.string().describe("The setting key to update"),
      value: z.string().describe("The new value"),
    }),
    execute: async ({ key, value }) => {
      return {
        success: true,
        message: `Setting "${key}" updated to "${value}".`,
      };
    },
  }),
};
