# aha-mcp

Model Context Protocol (MCP) server for accessing Aha! records through the MCP. This integration enables seamless interaction with Aha! features, requirements, and pages directly through the Model Context Protocol.

## Prerequisites

- Node.js v20 or higher
- npm (usually comes with Node.js)
- An Aha! account with API access

## Installation

### Using npx

```bash
npx -y aha-mcp@latest
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/aha-develop/aha-mcp.git
cd aha-mcp

# Install dependencies
npm install

# Run the server
npm run mcp-start
```

## Authentication Setup

1. Log in to your Aha! account at `<yourcompany>.aha.io`
2. Visit [secure.aha.io/settings/api_keys](https://secure.aha.io/settings/api_keys)
3. Click "Create new API key"
4. Copy the token immediately (it won't be shown again)

For more details about authentication and API usage, see the [Aha! API documentation](https://www.aha.io/api).

## Environment Variables

This MCP server requires the following environment variables:

- `AHA_API_TOKEN`: Your Aha! API token
- `AHA_DOMAIN`: Your Aha! domain (e.g., yourcompany if you access aha at yourcompany.aha.io)

## IDE Integration

For security reasons, we recommend using your preferred secure method for managing environment variables rather than storing API tokens directly in editor configurations. Each editor has different security models and capabilities for handling sensitive information.

Below are examples of how to configure various editors to use the aha-mcp server. You should adapt these examples to use your preferred secure method for providing the required environment variables.

### VSCode

The instructions below were copied from the instructions [found here](https://code.visualstudio.com/docs/copilot/chat/mcp-servers#_add-an-mcp-server).

Add this to your `.vscode/settings.json`, using your preferred method to securely provide the environment variables:

```json
{
  "mcp": {
    "servers": {
      "aha-mcp": {
        "command": "npx",
        "args": ["-y", "aha-mcp"]
        // Environment variables should be provided through your preferred secure method
      }
    }
  }
}
```

### Cursor

1. Go to Cursor Settings > MCP
2. Click + Add new Global MCP Server
3. Add a configuration similar to:

```json
{
  "mcpServers": {
    "aha-mcp": {
      "command": "npx",
      "args": ["-y", "aha-mcp"]
      // Environment variables should be provided through your preferred secure method
    }
  }
}
```

### Cline

Add a configuration to your `cline_mcp_settings.json` via Cline MCP Server settings:

```json
{
  "mcpServers": {
    "aha-mcp": {
      "command": "npx",
      "args": ["-y", "aha-mcp"]
      // Environment variables should be provided through your preferred secure method
    }
  }
}
```

### RooCode

Open the MCP settings by either:

- Clicking "Edit MCP Settings" in RooCode settings, or
- Using the "RooCode: Open MCP Config" command in VS Code's command palette

Then add:

```json
{
  "mcpServers": {
    "aha-mcp": {
      "command": "npx",
      "args": ["-y", "aha-mcp"]
      // Environment variables should be provided through your preferred secure method
    }
  }
}
```

### Claude Desktop

Add a configuration to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aha-mcp": {
      "command": "npx",
      "args": ["-y", "aha-mcp"]
      // Environment variables should be provided through your preferred secure method
    }
  }
}
```

## Available MCP Tools

### 1. get_record

Retrieves an Aha! feature or requirement by reference number.

**Parameters:**

- `reference` (required): Reference number of the feature or requirement (e.g., "DEVELOP-123")

**Example:**

```json
{
  "reference": "DEVELOP-123"
}
```

**Response:**

```json
{
  "reference_num": "DEVELOP-123",
  "name": "Feature name",
  "description": "Feature description",
  "workflow_status": {
    "name": "In development",
    "id": "123456"
  }
}
```

### 2. get_page

Gets an Aha! page by reference number.

**Parameters:**

- `reference` (required): Reference number of the page (e.g., "ABC-N-213")
- `includeParent` (optional): Include parent page information. Defaults to false.

**Example:**

```json
{
  "reference": "ABC-N-213",
  "includeParent": true
}
```

**Response:**

```json
{
  "reference_num": "ABC-N-213",
  "name": "Page title",
  "body": "Page content",
  "parent": {
    "reference_num": "ABC-N-200",
    "name": "Parent page"
  }
}
```

### 3. search_documents

Searches for Aha! documents.

**Parameters:**

- `query` (required): Search query string
- `searchableType` (optional): Type of document to search for (e.g., "Page"). Defaults to "Page"

**Example:**

```json
{
  "query": "product roadmap",
  "searchableType": "Page"
}
```

**Response:**

```json
{
  "results": [
    {
      "reference_num": "ABC-N-123",
      "name": "Product Roadmap 2025",
      "type": "Page",
      "url": "https://company.aha.io/pages/ABC-N-123"
    }
  ],
  "total_results": 1
}
```

### 4. introspect_feature

Introspect the Feature type schema to see available fields. Useful for discovering what fields are available on features.

**Parameters:**

None required.

**Example:**

```json
{}
```

**Response:**

Returns the GraphQL schema information for the Feature type, including all available fields and their types.

### 5. get_record_rest

Get an Aha! feature using the REST API. This is useful for debugging custom fields, as the REST API returns the raw field data including custom field keys.

**Parameters:**

- `reference` (required): Feature reference number (e.g., "DEVELOP-123")

**Example:**

```json
{
  "reference": "DEVELOP-123"
}
```

**Response:**

Returns the full feature data from the REST API, including custom fields with their API keys.

### 6. list_features_in_release

List all features in a release. Automatically paginates through all results.

**Parameters:**

- `releaseReference` (required): Release reference number (e.g., "ACT-R-14" or "ACTIVATION-R-14")
- `perPage` (optional): Number of features per page (default 100, max 200)

**Example:**

```json
{
  "releaseReference": "ACTIVATION-R-14",
  "perPage": 100
}
```

**Response:**

```json
{
  "total_count": 25,
  "features": [
    {
      "reference_num": "ACTIVATION-123",
      "name": "Feature name",
      "workflow_status": { "name": "In development" }
    }
  ]
}
```

### 7. update_feature

Update a feature's fields including custom fields. Supports both standard Aha! fields and custom fields.

**Parameters:**

- `reference` (required): Feature reference number (e.g., "ACTIVATION-59")
- `fields` (required): Object containing field keys and values to update

**Standard Fields:**

- `name`, `workflow_kind`, `workflow_status`, `release`, `description`
- `assigned_to_user`, `tags`, `start_date`, `due_date`
- `initiative`, `epic`, `progress_source`, `progress`, `team`
- `initial_estimate`, `detailed_estimate`, `remaining_estimate`

**Custom Fields:**

Custom fields use their API key (e.g., `go_live_date` for "Release target date"). Use `get_record_rest` or `introspect_feature` to discover custom field keys.

**Example:**

```json
{
  "reference": "ACTIVATION-59",
  "fields": {
    "name": "Updated feature name",
    "due_date": "2025-03-15",
    "go_live_date": "2025-04-01"
  }
}
```

**Response:**

Returns the updated feature data.

## Example Queries

- "Get feature DEVELOP-123"
- "Fetch the product roadmap page ABC-N-213"
- "Search for pages about launch planning"
- "Get requirement ADT-123-1"
- "Find all pages mentioning Q2 goals"
- "List all features in release ACTIVATION-R-14"
- "Update feature ACTIVATION-59 with a new due date of 2025-03-15"
- "What fields are available on features?"
- "Get the raw REST data for feature DEVELOP-123 to see custom field keys"

## Configuration Options

| Variable        | Description                                 | Default  |
| --------------- | ------------------------------------------- | -------- |
| `AHA_API_TOKEN` | Your Aha! API token                         | Required |
| `AHA_DOMAIN`    | Your Aha! domain (e.g., yourcompany.aha.io) | Required |
| `LOG_LEVEL`     | Logging level (debug, info, warn, error)    | info     |
| `PORT`          | Port for SSE transport                      | 3000     |
| `TRANSPORT`     | Transport type (stdio or sse)               | stdio    |

## Custom Instructions

You can create a `custom_instructions/` folder in your project root to store instruction files that guide AI agents when reviewing or managing Aha! entries. These files are automatically ignored by git (via `.gitignore`) to keep team-specific or personal workflows private.

### Usage

1. Create the folder:
   ```bash
   mkdir custom_instructions
   ```

2. Add markdown files with your rules and guidelines (e.g., `growth-product-rules.md`, `launch-checklist.md`)

3. Reference these files in your AI conversations to enforce consistent standards when:
   - Creating or updating feature cards
   - Validating required fields
   - Applying team-specific naming conventions
   - Checking compliance with roadmap criteria

### Example

A `custom_instructions/growth-product-rules.md` file might define:
- Required field values for experiment vs. GA tickets
- Title prefixes (e.g., `[Exp]` for experiments)
- Tag requirements
- Launch date guidelines
- Validation checklists

This approach allows each team to maintain their own standards without affecting the shared codebase.

## Troubleshooting

<details>
<summary>Common Issues</summary>

1. Authentication errors:

   - Verify your API token is correct and properly set in your environment
   - Ensure the token has the necessary permissions in Aha!
   - Confirm you're using the correct Aha! domain

2. Server won't start:

   - Ensure all dependencies are installed
   - Check the Node.js version is v20 or higher
   - Verify the TypeScript compilation succeeds
   - Confirm environment variables are properly set and accessible

3. Connection issues:

   - Check your network connection
   - Verify your Aha! domain is accessible
   - Ensure your API token has not expired

4. API Request failures:

   - Check the reference numbers are correct
   - Verify the searchable type is valid
   - Ensure you have permissions to access the requested resources

5. Environment variable issues:
   - Make sure environment variables are properly set and accessible to the MCP server
   - Check that your secure storage method is correctly configured
   - Verify that the environment variables are being passed to the MCP server process
   </details>
