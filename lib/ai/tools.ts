/**
 * Tool definitions — Vercel AI SDK v6 pattern.
 *
 * - Server tools have an `execute` function (auto-runs on server).
 * - Client tools omit `execute` (UI renders, user responds via addToolOutput).
 * - All tools use `inputSchema` (NOT `parameters`).
 */

import { tool } from "ai";
import { z } from "zod";

/** Server tool: search documents by query */
export const searchDocuments = tool({
  description: "Search documents by query and return matching results",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    // Stub: in production this would hit a vector DB or search index
    return {
      results: [
        {
          title: `Result for "${query}"`,
          snippet: `This is a mock search result matching your query: ${query}`,
        },
        {
          title: "Getting Started Guide",
          snippet:
            "Learn how to set up Vercel AI SDK v6 with tools, streaming, and telemetry.",
        },
      ],
    };
  },
});

/** Client tool: ask the user a multiple-choice question (NO execute) */
export const askQuestion = tool({
  description:
    "Present a multiple-choice question to the user and wait for their selection",
  inputSchema: z.object({
    question: z.string().describe("The question to ask"),
    options: z
      .array(z.string())
      .min(2)
      .describe("The answer options to present"),
  }),
  // No execute function — client-side tool.
  // The conversation pauses, UI renders options, user picks one,
  // then addToolOutput() sends the selection back.
});

/** Server tool: update a configuration setting */
export const updateSettings = tool({
  description: "Update a project configuration setting",
  inputSchema: z.object({
    key: z.string().describe("The setting key to update"),
    value: z.string().describe("The new value"),
  }),
  execute: async ({ key, value }) => {
    // Stub: in production this would persist to a database
    return { success: true, key, value };
  },
});

/** All tools as a single object for the chat route */
export const allTools = {
  searchDocuments,
  askQuestion,
  updateSettings,
};
