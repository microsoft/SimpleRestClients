declare function isString (value?: any): boolean;
declare function clone <T>(value: T, isDeep?: boolean, customizer?: (value: any) => any, thisArg?: any): T;
declare function defaults<T, TResult>(
            object: T,
            ...sources: any[]): TResult;
declare function remove<T>(
            array: any,
            predicate?: (value: any, index: number, collection: any) => any,
            thisArg?: any
        ): T[];
declare function findLastIndex<T>(
            array: any,
            predicate?: (value: any) => any,
            thisArg?: any
        ): number;
declare function attempt<TResult>(func: (...args: any[]) => TResult): TResult|Error;
declare function forEach<T>(
            collection:any,
            callback: (value: any, key: string) => any,
            thisArg?: any): Array<T>;
declare function map<T, TResult>(
            collection: any,
            iteratee?: (value: any, key: string) => any,
            thisArg?: any
        ): TResult[];
declare function isObject(value?: any): value is {};
declare function pull<T>(
            array: T[],
            ...values: T[]
        ): T[];

interface Dictionary<T> {
    [index: string]: T;
}

declare module "lodash.isstring"  { export = isString; }
declare module "lodash.clone" { export = clone; }
declare module "lodash.defaults" { export = defaults; }
declare module "lodash.remove" { export = remove; }
declare module "lodash.findlastindex" { export = findLastIndex; }
declare module "lodash.attempt" { export = attempt; }
declare module "lodash.foreach" { export = forEach; }
declare module "lodash.map" { export = map; }
declare module "lodash.isobject" { export = isObject; }
declare module "lodash.pull" { export = pull; }