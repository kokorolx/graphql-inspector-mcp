# GraphQL Introspection MCP Server

A Model Context Protocol (MCP) server that provides comprehensive GraphQL introspection capabilities with filtering and detailed analysis features.

## Features

- **Complete Schema Introspection**: Get full GraphQL schema with SDL and structured data
- **Smart Filtering**: Filter queries, mutations, and types with search patterns
- **Detailed Analysis**: Get comprehensive information about specific types and fields
- **Authentication Support**: Basic Auth and Bearer token authentication
- **Caching**: In-memory caching with 5-minute expiration for better performance
- **AI-Friendly Output**: Structured JSON responses optimized for AI agents

## Installation

```bash
npm install
npm run build
```

## Usage

### As MCP Server

Configure in your MCP client configuration:

```json
{
  "mcpServers": {
    "graphql-introspection": {
      "command": "node",
      "args": ["path/to/dist/index.js"]
    }
  }
}
```

### Available Tools

#### 1. get_graphql_schema
Get complete GraphQL schema introspection with SDL and structured data.

```json
{
  "endpoint": "http://localhost:5555/graphql",
  "username": "optional_username",
  "password": "optional_password",
  "bearer_token": "optional_bearer_token"
}
```

#### 2. filter_queries
Filter and list available GraphQL queries with optional search.

```json
{
  "endpoint": "http://localhost:5555/graphql",
  "search": "user",
  "detailed": true
}
```

#### 3. filter_mutations
Filter and list available GraphQL mutations with optional search.

```json
{
  "endpoint": "http://localhost:5555/graphql",
  "search": "create",
  "detailed": false
}
```

#### 4. filter_types
Filter and list available GraphQL types by kind and search pattern.

```json
{
  "endpoint": "http://localhost:5555/graphql",
  "search": "User",
  "kind": "OBJECT",
  "detailed": true
}
```

Supported type kinds:
- `OBJECT` - Object types
- `SCALAR` - Scalar types
- `ENUM` - Enumeration types
- `INTERFACE` - Interface types
- `UNION` - Union types
- `INPUT_OBJECT` - Input object types

#### 5. get_type_details
Get comprehensive information about a specific GraphQL type.

```json
{
  "type_name": "User",
  "endpoint": "http://localhost:5555/graphql"
}
```

#### 6. get_field_details
Get detailed information about a specific query or mutation field.

```json
{
  "field_name": "getUser",
  "operation_type": "query",
  "endpoint": "http://localhost:5555/graphql"
}
```

## Authentication

The server supports multiple authentication methods:

### Basic Authentication
```json
{
  "endpoint": "https://api.example.com/graphql",
  "username": "your_username",
  "password": "your_password"
}
```

### Bearer Token
```json
{
  "endpoint": "https://api.example.com/graphql",
  "bearer_token": "your_jwt_token"
}
```

## Response Format

All responses are structured JSON optimized for AI processing:

### Success Response
```json
{
  "success": true,
  "endpoint": "http://localhost:5555/graphql",
  "data": {
    // ... relevant data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "endpoint": "http://localhost:5555/graphql"
}
```

## Example Responses

### Filter Queries (Summary)
```json
{
  "success": true,
  "endpoint": "http://localhost:5555/graphql",
  "search_term": "user",
  "queries": [
    {
      "name": "getUser",
      "description": "Fetch a user by ID",
      "deprecated": false,
      "deprecation_reason": null
    },
    {
      "name": "searchUsers",
      "description": "Search users by criteria",
      "deprecated": false,
      "deprecation_reason": null
    }
  ],
  "total": 2
}
```

### Filter Queries (Detailed)
```json
{
  "success": true,
  "endpoint": "http://localhost:5555/graphql",
  "queries": [
    {
      "name": "getUser",
      "description": "Fetch a user by ID",
      "deprecated": false,
      "deprecation_reason": null,
      "arguments": [
        {
          "name": "id",
          "description": "User ID",
          "type": {
            "kind": "NON_NULL",
            "of_type": {
              "kind": "SCALAR",
              "name": "ID"
            },
            "is_required": true
          },
          "default_value": null
        }
      ],
      "return_type": {
        "kind": "OBJECT",
        "name": "User",
        "description": "A user in the system"
      }
    }
  ],
  "total": 1
}
```

### Type Details
```json
{
  "success": true,
  "endpoint": "http://localhost:5555/graphql",
  "type": {
    "name": "User",
    "kind": "OBJECT",
    "description": "A user in the system",
    "fields": [
      {
        "name": "id",
        "description": "Unique identifier",
        "type": {
          "kind": "NON_NULL",
          "of_type": {
            "kind": "SCALAR",
            "name": "ID"
          },
          "is_required": true
        },
        "deprecated": false,
        "deprecation_reason": null
      },
      {
        "name": "email",
        "description": "User email address",
        "type": {
          "kind": "SCALAR",
          "name": "String"
        },
        "deprecated": false,
        "deprecation_reason": null
      }
    ],
    "interfaces": [],
    "possible_types": null
  }
}
```

## Caching

The server implements in-memory caching with the following characteristics:

- **Cache Duration**: 5 minutes
- **Cache Key**: Combination of endpoint URL and authentication method
- **Automatic Invalidation**: Expired entries are automatically removed
- **Performance**: Subsequent requests to the same endpoint return cached data instantly

## Error Handling

The server provides comprehensive error handling for:

- **Network Issues**: Connection timeouts, DNS resolution failures
- **HTTP Errors**: 4xx and 5xx responses from GraphQL endpoints
- **GraphQL Errors**: Schema validation errors, introspection failures
- **Authentication Errors**: Invalid credentials, expired tokens
- **Validation Errors**: Missing required parameters, invalid type names

## Development

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Clean Build
```bash
npm run clean
npm run build
```

## Configuration

### Default Settings
- **Default Endpoint**: `http://localhost:5555/graphql`
- **Cache Duration**: 5 minutes (300 seconds)
- **Timeout**: Uses fetch default timeout
- **Max Cache Size**: No limit (memory permitting)

### Environment Variables
You can override default settings using environment variables:

```bash
export GRAPHQL_DEFAULT_ENDPOINT="http://localhost:4000/graphql"
export CACHE_DURATION_MS="600000"  # 10 minutes
```

## Best Practices

### For AI Agents
1. **Use Detailed Mode**: Set `detailed: true` when you need comprehensive information
2. **Filter Effectively**: Use search patterns to reduce response size
3. **Cache Awareness**: Subsequent calls to the same endpoint will be faster due to caching
4. **Error Handling**: Always check the `success` field in responses

### For Performance
1. **Specific Searches**: Use specific search terms to reduce response size
2. **Type Filtering**: Use the `kind` parameter when filtering types
3. **Summary Mode**: Use `detailed: false` for quick overviews
4. **Endpoint Reuse**: Reuse the same endpoint URL to benefit from caching

## Troubleshooting

### Common Issues

**Schema not found**
- Verify the GraphQL endpoint URL is correct
- Check if the endpoint requires authentication
- Ensure the endpoint supports introspection queries

**Authentication failures**
- Verify credentials are correct
- Check if the endpoint expects Basic Auth or Bearer tokens
- Ensure tokens haven't expired

**Network timeouts**
- Check network connectivity to the GraphQL endpoint
- Verify firewall settings allow outbound connections
- Consider if the GraphQL server is running and responsive

### Debug Mode
Enable debug logging by setting the environment variable:
```bash
export DEBUG=graphql-introspection:*
```

## License

MIT License - see LICENSE file for details.