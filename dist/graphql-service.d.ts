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
export declare class GraphQLIntrospectionService {
    private cache;
    private readonly CACHE_DURATION;
    private readonly DEFAULT_ENDPOINT;
    private getCacheKey;
    private isValidCache;
    private fetchIntrospection;
    getSchema(options?: BaseOptions): Promise<any>;
    filterQueries(options?: FilterOptions): Promise<any>;
    filterMutations(options?: FilterOptions): Promise<any>;
    filterTypes(options?: TypeFilterOptions): Promise<any>;
    getTypeDetails(options: TypeDetailsOptions): Promise<any>;
    getFieldDetails(options: FieldDetailsOptions): Promise<any>;
    private formatTypes;
    private formatFields;
    private formatArguments;
    private formatType;
    private formatTypeFields;
    private formatEnumValues;
    private formatInputFields;
}
export {};
