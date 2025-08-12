const fetch = require('node-fetch');
const { getIntrospectionQuery, buildClientSchema, printSchema } = require('graphql');

interface AuthOptions {
  username?: string;
  password?: string;
  bearer_token?: string;
}

interface BaseOptions extends AuthOptions {
  endpoint?: string;
}

interface FilterOptions extends BaseOptions {
  search?: string;
  detailed?: boolean;
}

interface TypeFilterOptions extends FilterOptions {
  kind?: string;
}

interface TypeDetailsOptions extends BaseOptions {
  type_name: string;
}

interface FieldDetailsOptions extends BaseOptions {
  field_name: string;
  operation_type?: 'query' | 'mutation';
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

export class GraphQLIntrospectionService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_ENDPOINT =
    process.env.BASE_URL || 'http://localhost:5555/graphql';

  private getCacheKey(endpoint: string, auth: AuthOptions): string {
    const authKey = auth.username || auth.bearer_token || 'no-auth';
    return `${endpoint}:${authKey}`;
  }

  private isValidCache(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_DURATION;
  }

  private async fetchIntrospection(endpoint: string, auth: AuthOptions): Promise<any> {
    console.info('🚀🚀🚀 ====== endpoint:', endpoint)
    const cacheKey = this.getCacheKey(endpoint, auth);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isValidCache(cached)) {
      return cached.data;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication headers
    if (auth.bearer_token) {
      headers['Authorization'] = `Bearer ${auth.bearer_token}`;
    } else if (auth.username && auth.password) {
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

      const result = await response.json() as any;

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: result.data,
        timestamp: Date.now(),
      });

      return result.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch GraphQL schema: ${error.message}`);
      }
      throw new Error('Failed to fetch GraphQL schema: Unknown error');
    }
  }

  async getSchema(options: BaseOptions = {}): Promise<any> {
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
    } catch (error) {
      throw new Error(`Failed to build schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async filterQueries(options: FilterOptions = {}): Promise<any> {
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

    const queryTypeData = introspectionData.__schema.types.find(
      (type: any) => type.name === queryType.name
    );

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
      queries = queries.filter((field: any) =>
        field.name.toLowerCase().includes(searchLower) ||
        (field.description && field.description.toLowerCase().includes(searchLower))
      );
    }

    const formattedQueries = queries.map((field: any) => {
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

  async filterMutations(options: FilterOptions = {}): Promise<any> {
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

    const mutationTypeData = introspectionData.__schema.types.find(
      (type: any) => type.name === mutationType.name
    );

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
      mutations = mutations.filter((field: any) =>
        field.name.toLowerCase().includes(searchLower) ||
        (field.description && field.description.toLowerCase().includes(searchLower))
      );
    }

    const formattedMutations = mutations.map((field: any) => {
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

  async filterTypes(options: TypeFilterOptions = {}): Promise<any> {
    const endpoint = options.endpoint ?? this.DEFAULT_ENDPOINT;
    const introspectionData = await this.fetchIntrospection(endpoint, options);

    let types = introspectionData.__schema.types.filter(
      (type: any) => !type.name.startsWith('__') // Filter out introspection types
    );

    // Apply kind filter
    if (options.kind) {
      types = types.filter((type: any) => type.kind === options.kind);
    }

    // Apply search filter
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      types = types.filter((type: any) =>
        type.name.toLowerCase().includes(searchLower) ||
        (type.description && type.description.toLowerCase().includes(searchLower))
      );
    }

    const formattedTypes = types.map((type: any) => {
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
          interfaces: type.interfaces ? type.interfaces.map((i: any) => i.name) : null,
          possible_types: type.possibleTypes ? type.possibleTypes.map((t: any) => t.name) : null,
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

  async getTypeDetails(options: TypeDetailsOptions): Promise<any> {
    const endpoint = options.endpoint ?? this.DEFAULT_ENDPOINT;
    const introspectionData = await this.fetchIntrospection(endpoint, options);

    const type = introspectionData.__schema.types.find(
      (t: any) => t.name === options.type_name
    );

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
        interfaces: type.interfaces ? type.interfaces.map((i: any) => ({
          name: i.name,
          kind: i.kind,
        })) : null,
        possible_types: type.possibleTypes ? type.possibleTypes.map((t: any) => ({
          name: t.name,
          kind: t.kind,
        })) : null,
        of_type: type.ofType ? this.formatType(type) : null,
      },
    };
  }

  async getFieldDetails(options: FieldDetailsOptions): Promise<any> {
    const endpoint = options.endpoint ?? this.DEFAULT_ENDPOINT;
    const introspectionData = await this.fetchIntrospection(endpoint, options);

    const operationType = options.operation_type || 'query';
    const rootType = operationType === 'mutation'
      ? introspectionData.__schema.mutationType
      : introspectionData.__schema.queryType;

    if (!rootType) {
      throw new Error(`No ${operationType} type available`);
    }

    const typeData = introspectionData.__schema.types.find(
      (type: any) => type.name === rootType.name
    );

    if (!typeData || !typeData.fields) {
      throw new Error(`${operationType} type has no fields`);
    }

    const field = typeData.fields.find((f: any) => f.name === options.field_name);

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

  private formatTypes(types: any[]): any[] {
    return types
      .filter(type => !type.name.startsWith('__'))
      .map(type => ({
        name: type.name,
        kind: type.kind,
        description: type.description,
      }));
  }

  private formatFields(typeName: string | undefined, types: any[]): any[] {
    if (!typeName) return [];

    const type = types.find(t => t.name === typeName);
    if (!type || !type.fields) return [];

    return type.fields.map((field: any) => ({
      name: field.name,
      description: field.description,
      arguments: this.formatArguments(field.args),
      return_type: this.formatType(field.type),
      deprecated: field.isDeprecated,
      deprecation_reason: field.deprecationReason,
    }));
  }

  private formatArguments(args: any[]): any[] {
    if (!args) return [];

    return args.map(arg => ({
      name: arg.name,
      description: arg.description,
      type: this.formatType(arg.type),
      default_value: arg.defaultValue,
    }));
  }

  private formatType(type: any): any {
    if (!type) return null;

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

  private formatTypeFields(fields: any[]): any[] {
    return fields.map(field => ({
      name: field.name,
      description: field.description,
      type: this.formatType(field.type),
      deprecated: field.isDeprecated,
      deprecation_reason: field.deprecationReason,
    }));
  }

  private formatEnumValues(values: any[]): any[] {
    return values.map(value => ({
      name: value.name,
      description: value.description,
      deprecated: value.isDeprecated,
      deprecation_reason: value.deprecationReason,
    }));
  }

  private formatInputFields(fields: any[]): any[] {
    return fields.map(field => ({
      name: field.name,
      description: field.description,
      type: this.formatType(field.type),
      default_value: field.defaultValue,
    }));
  }
}

module.exports = { GraphQLIntrospectionService };