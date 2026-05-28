import { z } from "zod";
import { workflowyClient } from "../workflowy/client.js";

const LAYOUT_HINT = "Layout mode: bullets | todo | h1 | h2 | h3 | code-block | quote-block";

export const workflowyTools: Record<string, any> = {
  list_nodes: {
    description: "List nodes in Workflowy. If a `parentId` is provided, it lists the child nodes of that parent. If omitted, it lists the root nodes. By default only returns top-level nodes (depth=0). WARNING: Using depth=-1 (unlimited) can return massive amounts of data and blow up your context - use sparingly!",
    inputSchema: {
      parentId: z.string().optional().describe("ID of the parent node to list children from. If omitted, returns root nodes."),
      depth: z.number().optional().describe("How many levels deep to return. 0 = top level only (default), 1 = include immediate children, -1 = unlimited (WARNING: can return huge amounts of data!)")
    },
    handler: async ({ parentId, depth }: { parentId?: string, depth?: number }) => {
      try {
        const effectiveDepth = depth ?? 0;
        const items = parentId
          ? await workflowyClient.getChildItems(parentId, effectiveDepth)
          : await workflowyClient.getRootItems(effectiveDepth);
        return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error listing nodes: ${error.message}` }] };
      }
    },
    annotations: {
      title: "List nodes in Workflowy",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },

  get_node: {
    description: "Get the full details of a single node by ID (name, note, parent, layout mode, completion and timestamps).",
    inputSchema: {
      nodeId: z.string().describe("ID of the node to retrieve")
    },
    annotations: {
      title: "Get a node in Workflowy",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async ({ nodeId }: { nodeId: string }) => {
      try {
        const node = await workflowyClient.getNode(nodeId);
        return { content: [{ type: "text", text: JSON.stringify(node, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error getting node: ${error.message}` }] };
      }
    }
  },

  search_nodes: {
    description: "Search nodes in Workflowy by text (matches node name or note, case-insensitive). Returns { total, returned, results }; results are capped by `limit`.",
    inputSchema: {
      query: z.string().describe("Search query to find matching nodes"),
      limit: z.number().optional().describe("Maximum number of results to return (default 50). Use -1 for no limit (can be large).")
    },
    annotations: {
      title: "Search nodes in Workflowy",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async ({ query, limit }: { query: string, limit?: number }) => {
      try {
        const result = await workflowyClient.search(query, limit ?? 50);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error searching nodes: ${error.message}` }] };
      }
    }
  },

  create_node: {
    description: "Create a new node. parentId may be a node ID, a shortcut/system target key (e.g. \"inbox\", \"today\"), or omitted to create at the root.",
    inputSchema: {
      parentId: z.string().optional().describe("ID of the parent node, or a target key like \"inbox\"/\"today\". If omitted, creates at root level."),
      name: z.string().describe("Name/title for the new node"),
      description: z.string().optional().describe("Description/note for the new node"),
      layoutMode: z.string().optional().describe(LAYOUT_HINT)
    },
    annotations: {
      title: "Create a new node in Workflowy",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    },
    handler: async ({ parentId, name, description, layoutMode }:
      { parentId?: string, name: string, description?: string, layoutMode?: string }) => {
      try {
        const newNodeId = await workflowyClient.createNode(parentId, name, description, layoutMode);
        return { content: [{ type: "text", text: JSON.stringify({ success: true, nodeId: newNodeId, name, parentId: parentId || "root" }) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error creating node: ${error.message}` }] };
      }
    }
  },

  update_node: {
    description: "Update an existing node's name, note and/or layout mode.",
    inputSchema: {
      nodeId: z.string().describe("ID of the node to update"),
      name: z.string().optional().describe("New name/title for the node"),
      description: z.string().optional().describe("New description/note for the node"),
      layoutMode: z.string().optional().describe(LAYOUT_HINT)
    },
    annotations: {
      title: "Update a node in Workflowy",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async ({ nodeId, name, description, layoutMode }:
      { nodeId: string, name?: string, description?: string, layoutMode?: string }) => {
      try {
        await workflowyClient.updateNode(nodeId, name, description, layoutMode);
        return { content: [{ type: "text", text: `Successfully updated node ${nodeId}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error updating node: ${error.message}` }] };
      }
    }
  },

  move_node: {
    description: "Move a node under a new parent (a node ID or a target key like \"inbox\"), optionally at a specific priority (lower sorts first).",
    inputSchema: {
      nodeId: z.string().describe("ID of the node to move"),
      parentId: z.string().describe("ID of the new parent node, or a target key like \"inbox\"/\"today\""),
      priority: z.number().optional().describe("Position among siblings (lower sorts first). If omitted, the API decides.")
    },
    annotations: {
      title: "Move a node in Workflowy",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false
    },
    handler: async ({ nodeId, parentId, priority }:
      { nodeId: string, parentId: string, priority?: number }) => {
      try {
        await workflowyClient.moveNode(nodeId, parentId, priority);
        return { content: [{ type: "text", text: `Successfully moved node ${nodeId} under ${parentId}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error moving node: ${error.message}` }] };
      }
    }
  },

  delete_node: {
    description: "Delete a node",
    inputSchema: {
      nodeId: z.string().describe("ID of the node to delete")
    },
    annotations: {
      title: "Delete a node in Workflowy",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false
    },
    handler: async ({ nodeId }: { nodeId: string }) => {
      try {
        await workflowyClient.deleteNode(nodeId);
        return { content: [{ type: "text", text: `Successfully deleted node ${nodeId}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error deleting node: ${error.message}` }] };
      }
    }
  },

  toggle_complete: {
    description: "Toggle completion status of a node",
    inputSchema: {
      nodeId: z.string().describe("ID of the node to toggle completion status"),
      completed: z.boolean().describe("Whether the node should be marked as complete (true) or incomplete (false)")
    },
    annotations: {
      title: "Toggle node completion in Workflowy",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async ({ nodeId, completed }: { nodeId: string, completed: boolean }) => {
      try {
        await workflowyClient.toggleComplete(nodeId, completed);
        return { content: [{ type: "text", text: `Successfully ${completed ? "completed" : "uncompleted"} node ${nodeId}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error toggling completion status: ${error.message}` }] };
      }
    }
  },

  list_targets: {
    description: "List shortcut and system targets (e.g. \"inbox\", \"today\") that can be used as a parent when creating or moving nodes.",
    inputSchema: {},
    annotations: {
      title: "List Workflowy targets",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async () => {
      try {
        const targets = await workflowyClient.listTargets();
        return { content: [{ type: "text", text: JSON.stringify(targets, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error listing targets: ${error.message}` }] };
      }
    }
  }
};
