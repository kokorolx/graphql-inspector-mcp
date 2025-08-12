"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLIntrospectionService = void 0;
const fetch = require('node-fetch');
const { getIntrospectionQuery, buildClientSchema, printSchema } = require('graphql');
class GraphQLIntrospectionService {
    constructor() {
        this.cache = new Map();
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        this.DEFAULT_ENDPOINT = process.env.BASE_URL || 'http://localhost:5555/graphql';
    }
    getCacheKey(endpoint, auth) {
        const authKey = auth.username || auth.bearer_token || 'no-auth';
        return `${endpoint}:${authKey}`;
    }
    isValidCache(entry) {
        return Date.now() - entry.timestamp < this.CACHE_DURATION;
    }
    async fetchIntrospection(endpoint, auth) {
        console.info('🚀🚀🚀 ====== endpoint:', endpoint);
        const cacheKey = this.getCacheKey(endpoint, auth);
        const cached = this.cache.get(cacheKey);
        if (cached && this.isValidCache(cached)) {
            return cached.data;
        }
        const headers = {
            'Content-Type': 'application/json',
        };
        // Add authentication headers
        if (auth.bearer_token) {
            headers['Authorization'] = `Bearer ${auth.bearer_token}`;
        }
        else if (auth.username && auth.password) {
            const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
        }
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    query: getIntrospectionQuery(),
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();
            if (result.errors) {
                throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
            }
            // Cache the result
            this.cache.set(cacheKey, {
                data: result.data,
                timestamp: Date.now(),
            });
            return result.data;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to fetch GraphQL schema: ${error.message}`);
            }
            throw new Error('Failed to fetch GraphQL schema: Unknown error');
        }
    }
    async getSchema(options = {}) {
        const endpoint = options.endpoint ?? this.DEFAULT_ENDPOINT;
        const introspectionData = await this.fetchIntrospection(endpoint, options);
        try {
            const schema = buildClientSchema(introspectionData);
            const sdl = printSchema(schema);
            return {
                success: true,
                endpoint,
                schema: {
                    sdl,
                    introspection: introspectionData,
                    types: this.formatTypes(introspectionData.__schema.types),
                    queries: this.formatFields(introspectionData.__schema.queryType?.name, introspectionData.__schema.types),
                    mutations: this.formatFields(introspectionData.__schema.mutationType?.name, introspectionData.__schema.types),
                    subscriptions: this.formatFields(introspectionData.__schema.subscriptionType?.name, introspectionData.__schema.types),
                },
            };
        }
        catch (error) {
            throw new Error(`Failed to build schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async filterQueries(options = {}) {
        const endpoint = options.endpoint ?? this.DEFAULT_ENDPOINT;
        const introspectionData = await this.fetchIntrospection(endpoint, options);
        const queryType = introspectionData.__schema.queryType;
        if (!queryType) {
            return {
                success: true,
                endpoint,
                queries: [],
                total: 0,
            };
        }
        const queryTypeData = introspectionData.__schema.types.find((type) => type.name === queryType.name);
        if (!queryTypeData || !queryTypeData.fields) {
            return {
                success: true,
                endpoint,
                queries: [],
                total: 0,
            };
        }
        let queries = queryTypeData.fields;
        // Apply search filter
        if (options.search) {
            const searchLower = options.search.toLowerCase();
            queries = queries.filter((field) => field.name.toLowerCase().includes(searchLower) ||
                (field.description && field.description.toLowerCase().includes(searchLower)));
        }
        const formattedQueries = queries.map((field) => {
            const base = {
                name: field.name,
                description: field.description,
                deprecated: field.isDeprecated,
                deprecation_reason: field.deprecationReason,
            };
            if (options.detailed) {
                return {
                    ...base,
                    arguments: this.formatArguments(field.args),
                    return_type: this.formatType(field.type),
                };
            }
            return base;
        });
        return {
            success: true,
            endpoint,
            search_term: options.search,
            queries: formattedQueries,
            total: formattedQueries.length,
        };
    }
    async filterMutations(options = {}) {
        const endpoint = options.endpoint ?? this.DEFAULT_ENDPOINT;
        const introspectionData = await this.fetchIntrospection(endpoint, options);
        const mutationType = introspectionData.__schema.mutationType;
        if (!mutationType) {
            return {
                success: true,
                endpoint,
                mutations: [],
                total: 0,
            };
        }
        const mutationTypeData = introspectionData.__schema.types.find((type) => type.name === mutationType.name);
        if (!mutationTypeData || !mutationTypeData.fields) {
            return {
                success: true,
                endpoint,
                mutations: [],
                total: 0,
            };
        }
        let mutations = mutationTypeData.fields;
        // Apply search filter
        if (options.search) {
            const searchLower = options.search.toLowerCase();
            mutations = mutations.filter((field) => field.name.toLowerCase().includes(searchLower) ||
                (field.description && field.description.toLowerCase().includes(searchLower)));
        }
        const formattedMutations = mutations.map((field) => {
            const base = {
                name: field.name,
                description: field.description,
                deprecated: field.isDeprecated,
                deprecation_reason: field.deprecationReason,
            };
            if (options.detailed) {
                return {
                    ...base,
                    arguments: this.formatArguments(field.args),
                    return_type: this.formatType(field.type),
                };
            }
            return base;
        });
        return {
            success: true,
            endpoint,
            search_term: options.search,
            mutations: formattedMutations,
            total: formattedMutations.length,
        };
    }
    async filterTypes(options = {}) {
        const endpoint = options.endpoint ?? this.DEFAULT_ENDPOINT;
        const introspectionData = await this.fetchIntrospection(endpoint, options);
        let types = introspectionData.__schema.types.filter((type) => !type.name.startsWith('__') // Filter out introspection types
        );
        // Apply kind filter
        if (options.kind) {
            types = types.filter((type) => type.kind === options.kind);
        }
        // Apply search filter
        if (options.search) {
            const searchLower = options.search.toLowerCase();
            types = types.filter((type) => type.name.toLowerCase().includes(searchLower) ||
                (type.description && type.description.toLowerCase().includes(searchLower)));
        }
        const formattedTypes = types.map((type) => {
            const base = {
                name: type.name,
                kind: type.kind,
                description: type.description,
            };
            if (options.detailed) {
                return {
                    ...base,
                    fields: type.fields ? this.formatTypeFields(type.fields) : null,
                    enum_values: type.enumValues ? this.formatEnumValues(type.enumValues) : null,
                    input_fields: type.inputFields ? this.formatInputFields(type.inputFields) : null,
                    interfaces: type.interfaces ? type.interfaces.map((i) => i.name) : null,
                    possible_types: type.possibleTypes ? type.possibleTypes.map((t) => t.name) : null,
                };
            }
            return base;
        });
        return {
            success: true,
            endpoint,
            search_term: options.search,
            kind_filter: options.kind,
            types: formattedTypes,
            total: formattedTypes.length,
        };
    }
    async getTypeDetails(options) {
        const endpoint = options.endpoint ?? this.DEFAULT_ENDPOINT;
        const introspectionData = await this.fetchIntrospection(endpoint, options);
        const type = introspectionData.__schema.types.find((t) => t.name === options.type_name);
        if (!type) {
            throw new Error(`Type "${options.type_name}" not found`);
        }
        return {
            success: true,
            endpoint,
            type: {
                name: type.name,
                kind: type.kind,
                description: type.description,
                fields: type.fields ? this.formatTypeFields(type.fields) : null,
                enum_values: type.enumValues ? this.formatEnumValues(type.enumValues) : null,
                input_fields: type.inputFields ? this.formatInputFields(type.inputFields) : null,
                interfaces: type.interfaces ? type.interfaces.map((i) => ({
                    name: i.name,
                    kind: i.kind,
                })) : null,
                possible_types: type.possibleTypes ? type.possibleTypes.map((t) => ({
                    name: t.name,
                    kind: t.kind,
                })) : null,
                of_type: type.ofType ? this.formatType(type) : null,
            },
        };
    }
    async getFieldDetails(options) {
        const endpoint = options.endpoint ?? this.DEFAULT_ENDPOINT;
        const introspectionData = await this.fetchIntrospection(endpoint, options);
        const operationType = options.operation_type || 'query';
        const rootType = operationType === 'mutation'
            ? introspectionData.__schema.mutationType
            : introspectionData.__schema.queryType;
        if (!rootType) {
            throw new Error(`No ${operationType} type available`);
        }
        const typeData = introspectionData.__schema.types.find((type) => type.name === rootType.name);
        if (!typeData || !typeData.fields) {
            throw new Error(`${operationType} type has no fields`);
        }
        const field = typeData.fields.find((f) => f.name === options.field_name);
        if (!field) {
            throw new Error(`Field "${options.field_name}" not found in ${operationType} type`);
        }
        return {
            success: true,
            endpoint,
            operation_type: operationType,
            field: {
                name: field.name,
                description: field.description,
                arguments: this.formatArguments(field.args),
                return_type: this.formatType(field.type),
                deprecated: field.isDeprecated,
                deprecation_reason: field.deprecationReason,
            },
        };
    }
    formatTypes(types) {
        return types
            .filter(type => !type.name.startsWith('__'))
            .map(type => ({
            name: type.name,
            kind: type.kind,
            description: type.description,
        }));
    }
    formatFields(typeName, types) {
        if (!typeName)
            return [];
        const type = types.find(t => t.name === typeName);
        if (!type || !type.fields)
            return [];
        return type.fields.map((field) => ({
            name: field.name,
            description: field.description,
            arguments: this.formatArguments(field.args),
            return_type: this.formatType(field.type),
            deprecated: field.isDeprecated,
            deprecation_reason: field.deprecationReason,
        }));
    }
    formatArguments(args) {
        if (!args)
            return [];
        return args.map(arg => ({
            name: arg.name,
            description: arg.description,
            type: this.formatType(arg.type),
            default_value: arg.defaultValue,
        }));
    }
    formatType(type) {
        if (!type)
            return null;
        if (type.kind === 'NON_NULL') {
            return {
                kind: 'NON_NULL',
                of_type: this.formatType(type.ofType),
                is_required: true,
            };
        }
        if (type.kind === 'LIST') {
            return {
                kind: 'LIST',
                of_type: this.formatType(type.ofType),
                is_list: true,
            };
        }
        return {
            kind: type.kind,
            name: type.name,
            description: type.description,
        };
    }
    formatTypeFields(fields) {
        return fields.map(field => ({
            name: field.name,
            description: field.description,
            type: this.formatType(field.type),
            deprecated: field.isDeprecated,
            deprecation_reason: field.deprecationReason,
        }));
    }
    formatEnumValues(values) {
        return values.map(value => ({
            name: value.name,
            description: value.description,
            deprecated: value.isDeprecated,
            deprecation_reason: value.deprecationReason,
        }));
    }
    formatInputFields(fields) {
        return fields.map(field => ({
            name: field.name,
            description: field.description,
            type: this.formatType(field.type),
            default_value: field.defaultValue,
        }));
    }
}
exports.GraphQLIntrospectionService = GraphQLIntrospectionService;
module.exports = { GraphQLIntrospectionService };
