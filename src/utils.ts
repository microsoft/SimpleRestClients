/**
 * utils.ts
 * Copyright: Microsoft 2019
 */

export const assert = (cond: boolean, message: string): void => {
    if (!cond) {
        throw new Error(message);
    }
};
