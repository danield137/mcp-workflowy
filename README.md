[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/danield137-mcp-workflowy-badge.png)](https://mseep.ai/app/danield137-mcp-workflowy)

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-Install_mcp_workflowy_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=Workflowy%20MCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-workflowy%40latest%22%2C%22server%22%2C%22start%22%5D%2C%20%22env%22%3A%20%7B%22WORKFLOWY_USERNAME%22%3A%22%22%2C%20%22WORKFLOWY_PASSWORD%22%3A%20%22%22%7D%7D)
# Workflowy MCP

A Model Context Protocol (MCP) server for interacting with Workflowy. This server provides an MCP-compatible interface to Workflowy, allowing AI assistants to interact with your Workflowy lists programmatically.

<a href="https://glama.ai/mcp/servers/@danield137/mcp-workflowy">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@danield137/mcp-workflowy/badge" alt="mcp-workflowy MCP server" />
</a>

## What is MCP?

The Model Context Protocol (MCP) is a standardized way for AI models to interact with external tools and APIs. This server implements MCP to allow AI assistants (like ChatGPT) to read and manipulate your Workflowy lists through a set of defined tools.

## Features

- **Workflowy Integration**: Connect to your Workflowy account using username/password authentication
- **MCP Compatibility**: Full support for the Model Context Protocol
- **Tool Operations**: Search, create, update, and mark nodes as complete/incomplete in your Workflowy

## Example Usage:
Personally, I use workflowy as my project management tool.
Giving my agent access to my notes, and my code base, the following are useful prompts:

- "Show my all my notes on project XYZ in workflowy"
- "Review the codebase, mark all completed notes as completed"
- "Given my milestones on workflowy for this project, suggest what my next task should be"

## Installation

### Prerequisites
- Node.js v18 or higher
- A Workflowy account

### Quick Install

![NPM Version](https://img.shields.io/npm/v/mcp-workflowy)
![NPM Downloads](https://img.shields.io/npm/dm/mcp-workflowy)

```bash
# Install the package globally
npm install -g mcp-workflowy

# Or use npx to run it directly
npx mcp-workflowy server start
```

## Configuration

Create a `.env` file in your project directory with the following content:

```
WORKFLOWY_USERNAME=your_username_here
WORKFLOWY_PASSWORD=your_password_here
```

Alternatively, you can provide these credentials as environment variables when running the server.

## Usage

### Starting the Server
```bash
# If installed globally
mcp-workflowy server start

# Using npx
npx mcp-workflowy server start
```

### Available Tools

This MCP server provides the following tools to interact with your Workflowy:

1. **list_nodes** - Get a list of nodes from your Workflowy (root nodes or children of a specified node)
2. **search_nodes** - Search for nodes by query text
3. **create_node** - Create a new node in your Workflowy
4. **update_node** - Modify an existing node's text or description
5. **toggle_complete** - Mark a node as complete or incomplete

## Integrating with AI Assistants

To use this MCP server with AI assistants (like ChatGPT):

1. Start the MCP server as described above
2. Connect your AI assistant to the MCP server (refer to your AI assistant's documentation)
3. The AI assistant will now be able to read and manipulate your Workflowy lists

## One-Click
[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-Install_mcp_workflowy_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=Workflowy%20MCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-workflowy%40latest%22%2C%22server%22%2C%22start%22%5D%2C%20%22env%22%3A%20%7B%22WORKFLOWY_USERNAME%22%3A%22%22%2C%20%22WORKFLOWY_PASSWORD%22%3A%20%22%22%7D%7D)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.