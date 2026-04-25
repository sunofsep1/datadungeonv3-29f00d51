# Claude Desktop + Data Dungeon MCP Setup

## 1. Build the MCP server

cd mcp/datadungeon-mcp
npm install
npm run build

## 2. Find your config file

Mac: ~/Library/Application Support/Claude/claude_desktop_config.json
Windows: %APPDATA%\Claude\claude_desktop_config.json

## 3. Add this to your config

{
  "mcpServers": {
    "datadungeon": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/datadungeonv3/mcp/datadungeon-mcp/dist/index.js"],
      "env": {
        "DATADUNGEON_SUPABASE_URL": "https://YOUR_PROJECT.supabase.co",
        "DATADUNGEON_SUPABASE_SERVICE_ROLE_KEY": "YOUR_SERVICE_ROLE_KEY",
        "DATADUNGEON_ALLOWED_USER_IDS": "YOUR_USER_UUID"
      }
    }
  }
}

## 4. Restart Claude Desktop

You will see a hammer icon when MCP is connected.

## 5. What you can now say to Claude Desktop

- "Who are my hot leads this week?"
- "Log a call with Sarah Jones"
- "Create a task to follow up with John Smith on Friday"
- "What nurture steps are due today?"
- "Show me my upcoming appointments"
- "How many touches did I log this month?"
- "Search my listings for Noosa"
- "Enrol the Thompsons in the post-appraisal sequence"
