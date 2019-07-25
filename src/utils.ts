/**
 * utils.ts
 * Copyright: Microsoft 2019
 */

export const assert = (cond: boolean, message: string): void => {
    if (!cond) {
        throw new Error(message);
    }
};


export const isObject = (value: any): value is object => (
    value !== null && typeof value === 'object'
);

export const isString = (value: any): value is string => (
    typeof value === 'string'
);

export const attempt = <T>(func: (...args: any[]) => T, ...args: any[]): T | Error => {
    try {
        return func(...args);
    } catch (e) {
        return new Error(e);
    }
};

export const remove = <T = any>(array: T[], value: any): void => {
    for (let i = array.length - 1; i >= 0; i--) {
        if (array[i] === value) {
            array.splice(i, 1);
        }
    }
};

export const clone = <T = any>(value: T): T => {
    if (Array.isArray(value)) {
        return value.map(clone) as any;
    }

    if (isObject(value)) {
        return Object.keys(value)
            .reduce((res, key) => ({ ...res, [key]: clone(value[key as keyof T]) }), { } as any);
    }

    return value;
};
