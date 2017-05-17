/**
* lodashMini.ts
*
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT license.
*
* Imports a subset of lodash library needed for SimpleRestClient
*/

import clone = require('lodashMin.clone');
import isString = require('lodashMin.isString');
import defaults = require('lodashMin.defaults');
import remove = require('lodashMin.remove');
import findIndex = require('lodashMin.findIndex');
import attempt = require('lodashMin.attempt');
import forEach = require('lodashMin.forEach');
import map = require('lodashMin.map');
import isObject = require('lodashMin.isObject');
import pull = require('lodashMin.pull');

export interface Dictionary<T> {
    [index: string]: T;
}

export {
    clone,
    isString,
    defaults,
    remove,
    findIndex,
    attempt,
    forEach,
    map,
    isObject,
    pull
};