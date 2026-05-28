// Workflowy client backed by the official Workflowy API
// (https://workflowy.com/api-reference/). Authenticates with a Bearer API key
// generated at https://workflowy.com/api-key/, taken from WORKFLOWY_API_KEY.
//
// The official API rate-limits the heavy /nodes-export endpoint, so listing a
// single level uses the light GET /nodes?parent_id= endpoint. The full export
// is only used for deep listings and search, behind a short-lived cache that is
// invalidated on writes.

const API_BASE = process.env.WORKFLOWY_API_BASE || "https://workflowy.com/api/v1";
const ROOT = "None";
const EXPORT_TTL_MS = 60_000;
const DEFAULT_SEARCH_LIMIT = 50;

export const LAYOUT_MODES = ["bullets", "todo", "h1", "h2", "h3", "code-block", "quote-block"] as const;

interface RawNode {
    id: string;
    name: string;
    note: string | null;
    parent_id: string | null;
    priority: number;
    completed: boolean;
    data?: any;
    createdAt?: number;
    modifiedAt?: number;
    completedAt?: number | null;
}

interface OutNode {
    id: string;
    name: string;
    note?: string;
    completed: boolean;
    hasChildren?: boolean;
    items?: OutNode[];
}

let exportCache: { at: number; nodes: RawNode[] } | null = null;

function getApiKey(): string {
    const key = process.env.WORKFLOWY_API_KEY;
    if (!key) {
        throw new Error(
            "WORKFLOWY_API_KEY not set. Generate a key at https://workflowy.com/api-key/ " +
            "and set WORKFLOWY_API_KEY in your environment / .env file.");
    }
    return key;
}

async function api(method: string, path: string, body?: any): Promise<any> {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${getApiKey()}`,
        Accept: "application/json",
    };
    if (body !== undefined)
        headers["Content-Type"] = "application/json";

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data: any = undefined;
    if (text) {
        try { data = JSON.parse(text); } catch { data = text; }
    }

    if (!res.ok) {
        const msg = (data && (data.error || data.message)) || text || res.statusText;
        throw new Error(`Workflowy API ${method} ${path} failed (${res.status}): ${msg}`);
    }
    return data;
}

function stripHtml(s: string | null | undefined): string {
    return (s || "").replace(/<[^>]*>/g, "");
}

function bySortPriority(a: RawNode, b: RawNode): number {
    return (a.priority ?? 0) - (b.priority ?? 0);
}

class WorkflowyClient {
    private invalidateCache(): void {
        exportCache = null;
    }

    private async fetchAllNodes(): Promise<RawNode[]> {
        if (exportCache && Date.now() - exportCache.at < EXPORT_TTL_MS)
            return exportCache.nodes;
        const data = await api("GET", "/nodes-export");
        const nodes: RawNode[] = (data && data.nodes) || [];
        exportCache = { at: Date.now(), nodes };
        return nodes;
    }

    private childrenByParent(all: RawNode[]): Map<string, RawNode[]> {
        const byParent = new Map<string, RawNode[]>();
        for (const n of all) {
            const p = n.parent_id ?? ROOT;
            const arr = byParent.get(p);
            if (arr) arr.push(n); else byParent.set(p, [n]);
        }
        for (const arr of byParent.values())
            arr.sort(bySortPriority);
        return byParent;
    }

    private toOut(n: RawNode): OutNode {
        const out: OutNode = { id: n.id, name: n.name, completed: !!n.completed };
        if (n.note) out.note = n.note;
        return out;
    }

    private buildNode(n: RawNode, byParent: Map<string, RawNode[]>, levelsRemaining: number): OutNode {
        const out = this.toOut(n);
        const kids = byParent.get(n.id) || [];
        if (kids.length === 0)
            return out;
        if (levelsRemaining <= 0) {
            out.hasChildren = true;
            return out;
        }
        out.items = kids.map(k => this.buildNode(k, byParent, levelsRemaining - 1));
        return out;
    }

    // Single-level listing via the light, less rate-limited endpoint.
    private async listChildrenLight(parentId: string): Promise<OutNode[]> {
        const data = await api("GET", `/nodes?parent_id=${encodeURIComponent(parentId)}`);
        const nodes: RawNode[] = (data && data.nodes) || [];
        nodes.sort(bySortPriority);
        return nodes.map(n => this.toOut(n));
    }

    /**
     * Get the root nodes of the Workflowy document.
     * @param depth - How many levels deep to return. 0 = top level only, -1 = unlimited.
     */
    async getRootItems(depth: number = 0): Promise<OutNode[]> {
        if (depth === 0)
            return this.listChildrenLight(ROOT);
        const all = await this.fetchAllNodes();
        const byParent = this.childrenByParent(all);
        const lr = depth < 0 ? Number.POSITIVE_INFINITY : depth;
        return (byParent.get(ROOT) || []).map(n => this.buildNode(n, byParent, lr));
    }

    /**
     * Get the child nodes of a specific node.
     * @param depth - How many levels deep to return. 0 = immediate children only, -1 = unlimited.
     */
    async getChildItems(parentId: string, depth: number = 0): Promise<OutNode[]> {
        if (depth === 0)
            return this.listChildrenLight(parentId);
        const all = await this.fetchAllNodes();
        if (!all.some(n => n.id === parentId))
            throw new Error(`Parent node with ID ${parentId} not found.`);
        const byParent = this.childrenByParent(all);
        const lr = depth < 0 ? Number.POSITIVE_INFINITY : depth;
        return (byParent.get(parentId) || []).map(n => this.buildNode(n, byParent, lr));
    }

    /**
     * Retrieve a single node's full details (including parent, layout, timestamps).
     */
    async getNode(nodeId: string): Promise<any> {
        const data = await api("GET", `/nodes/${encodeURIComponent(nodeId)}`);
        const n: RawNode = (data && (data.node || data.nodes?.[0] || data)) as RawNode;
        const out: any = {
            id: n.id,
            name: n.name,
            completed: !!n.completed,
            priority: n.priority,
            createdAt: n.createdAt,
            modifiedAt: n.modifiedAt,
            completedAt: n.completedAt ?? null,
        };
        if (n.note) out.note = n.note;
        if (n.data?.layoutMode) out.layoutMode = n.data.layoutMode;
        // The single-node endpoint returns parent_id: null even for nested nodes,
        // so only surface it when the API actually provides a real parent.
        if (n.parent_id && n.parent_id !== ROOT) out.parentId = n.parent_id;
        return out;
    }

    /**
     * Search for nodes whose name or note contains the query (case-insensitive).
     * The official API has no search endpoint, so this filters the full export.
     * @param limit - Max results to return (default 50). Use -1 for no limit.
     */
    async search(query: string, limit: number = DEFAULT_SEARCH_LIMIT): Promise<{ total: number; returned: number; results: OutNode[] }> {
        const all = await this.fetchAllNodes();
        const q = query.toLowerCase();
        const matches = all.filter(n =>
            stripHtml(n.name).toLowerCase().includes(q) || (n.note || "").toLowerCase().includes(q));
        const results = (limit < 0 ? matches : matches.slice(0, limit)).map(n => this.toOut(n));
        return { total: matches.length, returned: results.length, results };
    }

    /**
     * Create a new node. parentId may be a node id, a shortcut/system target key
     * (e.g. "inbox", "today"), or omitted for the root. Returns the new node's id.
     */
    async createNode(parentId: string | undefined, name: string, description?: string, layoutMode?: string): Promise<string> {
        const body: any = { name, parent_id: parentId || ROOT };
        if (description) body.note = description;
        if (layoutMode) body.layoutMode = layoutMode;
        const data = await api("POST", "/nodes", body);
        this.invalidateCache();
        return (data && (data.item_id || data.id)) || "";
    }

    /**
     * Update an existing node's name, note and/or layout mode.
     */
    async updateNode(nodeId: string, name?: string, description?: string, layoutMode?: string): Promise<void> {
        const body: any = {};
        if (name !== undefined) body.name = name;
        if (description !== undefined) body.note = description;
        if (layoutMode !== undefined) body.layoutMode = layoutMode;
        if (Object.keys(body).length === 0) return;
        await api("POST", `/nodes/${encodeURIComponent(nodeId)}`, body);
        this.invalidateCache();
    }

    /**
     * Move a node under a new parent (a node id or shortcut/system target),
     * optionally at a specific priority (lower sorts first).
     */
    async moveNode(nodeId: string, parentId: string, priority?: number): Promise<void> {
        const body: any = { parent_id: parentId || ROOT };
        if (priority !== undefined) body.priority = priority;
        await api("POST", `/nodes/${encodeURIComponent(nodeId)}/move`, body);
        this.invalidateCache();
    }

    /**
     * Permanently delete a node.
     */
    async deleteNode(nodeId: string): Promise<void> {
        await api("DELETE", `/nodes/${encodeURIComponent(nodeId)}`);
        this.invalidateCache();
    }

    /**
     * Mark a node complete or incomplete.
     */
    async toggleComplete(nodeId: string, completed: boolean): Promise<void> {
        const action = completed ? "complete" : "uncomplete";
        await api("POST", `/nodes/${encodeURIComponent(nodeId)}/${action}`);
        this.invalidateCache();
    }

    /**
     * List shortcut and system targets (e.g. "inbox", "today") that can be used
     * as a parent when creating or moving nodes.
     */
    async listTargets(): Promise<any> {
        const data = await api("GET", "/targets");
        return (data && (data.targets || data)) || [];
    }
}

// Export a singleton instance - methods are stateless apart from the cache.
export const workflowyClient = new WorkflowyClient();
