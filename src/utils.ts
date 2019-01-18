/**
 * utils.ts
 * Copyright: Microsoft 2019
 */

export const assert = (cond: boolean, message: string) => {
    if (!cond) {
        throw new Error(message);
    }
};
