#!/usr/bin/env node
"use strict";
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema, CallToolRequest, } = require('@modelcontextprotocol/sdk/types.js');
const { GraphQLIntrospectionService } = require('./graphql-service.js');
// Initialize the GraphQL service
const graphqlService = new GraphQLIntrospectionService();
// Create MCP server
const server = new Server({
    name: 'graphql-introspection-server',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'get_graphql_schema',
                description: 'Get complete GraphQL schema introspection',
                inputSchema: {
                    type: 'object',
                    properties: {
                        endpoint: {
                            type: 'string',
                            description: 'GraphQL endpoint URL (default: http://localhost:5555/graphql)',
                        },
                        username: {
                            type: 'string',
                            description: 'Username for basic authentication (optional)',
                        },
                        password: {
                            type: 'string',
                            description: 'Password for basic authentication (optional)',
                        },
                        bearer_token: {
                            type: 'string',
                            description: 'Bearer token for authentication (optional)',
                        },
                    },
                },
            },
            {
                name: 'filter_queries',
                description: 'Filter and list available GraphQL queries',
                inputSchema: {
                    type: 'object',
                    properties: {
                        endpoint: {
                            type: 'string',
                            description: 'GraphQL endpoint URL (default: http://localhost:5555/graphql)',
                        },
                        search: {
                            type: 'string',
                            description: 'Search pattern to filter queries (case-insensitive substring match)',
                        },
                        detailed: {
                            type: 'boolean',
                            description: 'Return detailed information including arguments and return types (default: false)',
                            default: false,
                        },
                        username: { type: 'string', description: 'Username for basic auth (optional)' },
                        password: { type: 'string', description: 'Password for basic auth (optional)' },
                        bearer_token: { type: 'string', description: 'Bearer token (optional)' },
                    },
                },
            },
            {
                name: 'filter_mutations',
                description: 'Filter and list available GraphQL mutations',
                inputSchema: {
                    type: 'object',
                    properties: {
                        endpoint: {
                            type: 'string',
                            description: 'GraphQL endpoint URL (default: http://localhost:5555/graphql)',
                        },
                        search: {
                            type: 'string',
                            description: 'Search pattern to filter mutations (case-insensitive substring match)',
                        },
                        detailed: {
                            type: 'boolean',
                            description: 'Return detailed information including arguments and return types (default: false)',
                            default: false,
                        },
                        username: { type: 'string', description: 'Username for basic auth (optional)' },
                        password: { type: 'string', description: 'Password for basic auth (optional)' },
                        bearer_token: { type: 'string', description: 'Bearer token (optional)' },
                    },
                },
            },
            {
                name: 'filter_types',
                description: 'Filter and list available GraphQL types',
                inputSchema: {
                    type: 'object',
                    properties: {
                        endpoint: {
                            type: 'string',
                            description: 'GraphQL endpoint URL (default: http://localhost:5555/graphql)',
                        },
                        search: {
                            type: 'string',
                            description: 'Search pattern to filter types (case-insensitive substring match)',
                        },
                        kind: {
                            type: 'string',
                            description: 'Filter by type kind (OBJECT, SCALAR, ENUM, INTERFACE, UNION, INPUT_OBJECT)',
                            enum: ['OBJECT', 'SCALAR', 'ENUM', 'INTERFACE', 'UNION', 'INPUT_OBJECT'],
                        },
                        detailed: {
                            type: 'boolean',
                            description: 'Return detailed information including fields (default: false)',
                            default: false,
                        },
                        username: { type: 'string', description: 'Username for basic auth (optional)' },
                        password: { type: 'string', description: 'Password for basic auth (optional)' },
                        bearer_token: { type: 'string', description: 'Bearer token (optional)' },
                    },
                },
            },
            {
                name: 'get_type_details',
                description: 'Get detailed information about a specific GraphQL type',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type_name: {
                            type: 'string',
                            description: 'Name of the type to get details for',
                        },
                        endpoint: {
                            type: 'string',
                            description: 'GraphQL endpoint URL (default: http://localhost:5555/graphql)',
                        },
                        username: { type: 'string', description: 'Username for basic auth (optional)' },
                        password: { type: 'string', description: 'Password for basic auth (optional)' },
                        bearer_token: { type: 'string', description: 'Bearer token (optional)' },
                    },
                    required: ['type_name'],
                },
            },
            {
                name: 'get_field_details',
                description: 'Get detailed information about a specific query or mutation field',
                inputSchema: {
                    type: 'object',
                    properties: {
                        field_name: {
                            type: 'string',
                            description: 'Name of the field to get details for',
                        },
                        operation_type: {
                            type: 'string',
                            description: 'Type of operation (query or mutation)',
                            enum: ['query', 'mutation'],
                            default: 'query',
                        },
                        endpoint: {
                            type: 'string',
                            description: 'GraphQL endpoint URL (default: http://localhost:5555/graphql)',
                        },
                        username: { type: 'string', description: 'Username for basic auth (optional)' },
                        password: { type: 'string', description: 'Password for basic auth (optional)' },
                        bearer_token: { type: 'string', description: 'Bearer token (optional)' },
                    },
                    required: ['field_name'],
                },
            },
        ],
    };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;
        switch (name) {
            case 'get_graphql_schema':
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(await graphqlService.getSchema(args), null, 2),
                        },
                    ],
                };
            case 'filter_queries':
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(await graphqlService.filterQueries(args), null, 2),
                        },
                    ],
                };
            case 'filter_mutations':
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(await graphqlService.filterMutations(args), null, 2),
                        },
                    ],
                };
            case 'filter_types':
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(await graphqlService.filterTypes(args), null, 2),
                        },
                    ],
                };
            case 'get_type_details':
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(await graphqlService.getTypeDetails(args), null, 2),
                        },
                    ],
                };
            case 'get_field_details':
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(await graphqlService.getFieldDetails(args), null, 2),
                        },
                    ],
                };
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        error: error instanceof Error ? error.message : 'Unknown error',
                        success: false,
                    }, null, 2),
                },
            ],
        };
    }
});
// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    process.exit(1);
});
