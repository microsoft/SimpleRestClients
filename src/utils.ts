/**
 * utils.ts
 * Copyright: Microsoft 2019
 */

export const assert = (cond: any, message?: string | undefined) => {
    if (!cond) {
        throw new Error(`${ message || 'Assertion Failed' }`);
    }
};
