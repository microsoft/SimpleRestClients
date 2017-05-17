/**
* lodashMini.d.ts
*
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT license.
*
* Defines types for lodashMini (required lodash library subset)
*/

interface List<T> {
    [index: number]: T;
    length: number;
}

interface Dictionary<T> {
    [index: string]: T;
}

interface ListIterator<T, TResult> {
    (value: T, index: number, collection: List<T>): TResult;
}

interface DictionaryIterator<T, TResult> {
    (value: T, key?: string, collection?: Dictionary<T>): TResult;
}

interface ObjectIterator<T, TResult> {
    (element: T, key?: string, collection?: any): TResult;
}

interface LodashMini {
    //_.isString
    /**
     * Checks if value is classified as a String primitive or object.
     * @param value The value to check.
     * @return Returns true if value is correctly classified, else false.
     **/
    isString (value?: any): boolean;

    //_.clone
    /**
     * Creates a clone of value. If isDeep is true nested objects are cloned, otherwise they are assigned by
     * reference. If customizer is provided it’s invoked to produce the cloned values. If customizer returns
     * undefined cloning is handled by the method instead. The customizer is bound to thisArg and invoked with up
     * to three argument; (value [, index|key, object]).
     * Note: This method is loosely based on the structured clone algorithm. The enumerable properties of arguments
     * objects and objects created by constructors other than Object are cloned to plain Object objects. An empty
     * object is returned for uncloneable values such as functions, DOM nodes, Maps, Sets, and WeakMaps.
     * @param value The value to clone.
     * @param isDeep Specify a deep clone.
     * @param customizer The function to customize cloning values.
     * @param thisArg The this binding of customizer.
     * @return Returns the cloned value.
     */
    clone<T>(
                value: T,
                isDeep?: boolean,
                customizer?: (value: any) => any,
                thisArg?: any): T;
    clone<T>(
                value: T,
                customizer?: (value: any) => any,
                thisArg?: any): T;

    //_.defaults
    /**
    * Assigns own enumerable properties of source object(s) to the destination object for all
    * destination properties that resolve to undefined. Once a property is set, additional defaults
    * of the same property will be ignored.
    * @param object The destination object.
    * @param sources The source objects.
    * @return The destination object.
    **/
    defaults<T, TResult>(
                object: T,
                ...sources: any[]): TResult;

    /**
     * Checks if value is the language type of Object. (e.g. arrays, functions, objects, regexes, new Number(0),
     * and new String(''))
     * @param value The value to check.
     * @return Returns true if value is an object, else false.
     **/
    isObject(value?: any): value is {};

    /**
     * Removes all elements from array that predicate returns truthy for and returns an array of the removed
     * elements. The predicate is bound to thisArg and invoked with three arguments: (value, index, array).
     *
     * If a property name is provided for predicate the created _.property style callback returns the property
     * value of the given element.
     *
     * If a value is also provided for thisArg the created _.matchesProperty style callback returns true for
     * elements that have a matching property value, else false.
     *
     * If an object is provided for predicate the created _.matches style callback returns true for elements that
     * have the properties of the given object, else false.
     *
     * Note: Unlike _.filter, this method mutates array.
     *
     * @param array The array to modify.
     * @param predicate The function invoked per iteration.
     * @param thisArg The this binding of predicate.
     * @return Returns the new array of removed elements.
     */
    remove<T>(
        array: List<T>,
        predicate?: ListIterator<T, boolean>,
        thisArg?: any
    ): T[];

    /**
     * @see _.remove
     */
    remove<T>(
        array: List<T>,
        predicate?: string,
        thisArg?: any
    ): T[];

    /**
     * @see _.remove
     */
    remove<W, T>(
        array: List<T>,
        predicate?: W
    ): T[];

    /**
     * This method is like _.find except that it returns the index of the first element predicate returns truthy
     * for instead of the element itself.
     *
     * If a property name is provided for predicate the created _.property style callback returns the property
     * value of the given element.
     *
     * If a value is also provided for thisArg the created _.matchesProperty style callback returns true for
     * elements that have a matching property value, else false.
     *
     * If an object is provided for predicate the created _.matches style callback returns true for elements that
     * have the properties of the given object, else false.
     *
     * @param array The array to search.
     * @param predicate The function invoked per iteration.
     * @param thisArg The this binding of predicate.
     * @return Returns the index of the found element, else -1.
     */
    findIndex<T>(
        array: List<T>,
        predicate?: ListIterator<T, boolean>,
        thisArg?: any
    ): number;

    /**
     * @see _.findIndex
     */
    findIndex<T>(
        array: List<T>,
        predicate?: string,
        thisArg?: any
    ): number;

    /**
     * @see _.findIndex
     */
    findIndex<W, T>(
        array: List<T>,
        predicate?: W
    ): number;

    /**
     * Attempts to invoke func, returning either the result or the caught error object. Any additional arguments
     * are provided to func when it’s invoked.
     * @param func The function to attempt.
     * @return Returns the func result or error object.
     */
    attempt<TResult>(func: (...args: any[]) => TResult): TResult|Error;

    /**
    * Iterates over elements of a collection, executing the callback for each element.
    * The callback is bound to thisArg and invoked with three arguments; (value, index|key,
    * collection). Callbacks may exit iteration early by explicitly returning false.
    * @param collection The collection to iterate over.
    * @param callback The function called per iteration.
    * @param thisArg The this binding of callback.
    **/
    forEach<T>(
        collection: Array<T>,
        callback: ListIterator<T, void>,
        thisArg?: any): Array<T>;

    /**
    * @see _.forEach
    **/
    forEach<T>(
        collection: List<T>,
        callback: ListIterator<T, void>,
        thisArg?: any): List<T>;

    /**
    * @see _.forEach
    **/
    forEach<T extends {}>(
        object: Dictionary<T>,
        callback: DictionaryIterator<T, void>,
        thisArg?: any): Dictionary<T>;

    /**
    * @see _.each
    **/
    forEach<T extends {}, TValue>(
        object: T,
        callback: ObjectIterator<TValue, void>,
        thisArg?: any): T;

    /**
     * Creates an array of values by running each element in collection through iteratee. The iteratee is bound to
     * thisArg and invoked with three arguments: (value, index|key, collection).
     *
     * If a property name is provided for iteratee the created _.property style callback returns the property value
     * of the given element.
     *
     * If a value is also provided for thisArg the created _.matchesProperty style callback returns true for
     * elements that have a matching property value, else false.
     *
     * If an object is provided for iteratee the created _.matches style callback returns true for elements that
     * have the properties of the given object, else false.
     *
     * Many lodash methods are guarded to work as iteratees for methods like _.every, _.filter, _.map, _.mapValues,
     * _.reject, and _.some.
     *
     * The guarded methods are:
     * ary, callback, chunk, clone, create, curry, curryRight, drop, dropRight, every, fill, flatten, invert, max,
     * min, parseInt, slice, sortBy, take, takeRight, template, trim, trimLeft, trimRight, trunc, random, range,
     * sample, some, sum, uniq, and words
     *
     * @alias _.collect
     *
     * @param collection The collection to iterate over.
     * @param iteratee The function invoked per iteration.
     * @param thisArg The this binding of iteratee.
     * @return Returns the new mapped array.
     */
    map<T, TResult>(
        collection: List<T>,
        iteratee?: ListIterator<T, TResult>,
        thisArg?: any
    ): TResult[];

    /**
     * @see _.map
     */
    map<T extends {}, TResult>(
        collection: Dictionary<T>,
        iteratee?: DictionaryIterator<T, TResult>,
        thisArg?: any
    ): TResult[];

    /**
     * @see _.map
     */
    map<T, TResult>(
        collection: List<T>,
        iteratee?: string
    ): TResult[];

    /**
     * @see _.map
     */
    map<T, TResult>(
        collection: Dictionary<T>,
        iteratee?: string
    ): TResult[];

    /**
     * @see _.map
     */
    map<T, TObject extends {}>(
        collection: List<T>,
        iteratee?: TObject
    ): boolean[];

    /**
     * @see _.map
     */
    map<T, TObject extends {}>(
        collection: Dictionary<T>,
        iteratee?: TObject
    ): boolean[];

    /**
     * Removes all provided values from array using SameValueZero for equality comparisons.
     *
     * Note: Unlike _.without, this method mutates array.
     *
     * @param array The array to modify.
     * @param values The values to remove.
     * @return Returns array.
     */
    pull<T>(
        array: T[],
        ...values: T[]
    ): T[];

    /**
     * @see _.pull
     */
    pull<T>(
        array: List<T>,
        ...values: T[]
    ): List<T>;
}

// exports
declare module "lodash/clone" {
    const _: LodashMini;
    const clone: typeof _.clone;
    export = clone;
}

declare module "lodash/defaults" {
    const _: LodashMini;
    const defaults: typeof _.defaults;
    export = defaults;
}

declare module "lodash/isString" {
    const _: LodashMini;
    const isString: typeof _.isString;
    export = isString;
}

declare module "lodash/remove" {
    const _: LodashMini;
    const remove: typeof _.remove;
    export = remove;
}

declare module "lodash/findIndex" {
    const _: LodashMini;
    const findIndex: typeof _.findIndex;
    export = findIndex;
}

declare module "lodash/attempt" {
    const _: LodashMini;
    const attempt: typeof _.attempt;
    export = attempt;
}

declare module "lodash/forEach" {
    const _: LodashMini;
    const forEach: typeof _.forEach;
    export = forEach;
}

declare module "lodash/map" {
    const _: LodashMini;
    const map: typeof _.map;
    export = map;
}

declare module "lodash/isObject" {
    const _: LodashMini;
    const isObject: typeof _.isObject;
    export = isObject;
}

declare module "lodash/pull" {
    const _: LodashMini;
    const pull: typeof _.pull;
    export = pull;
}
