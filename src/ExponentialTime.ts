/**
* ExponentialTime.ts
* Author: David de Regt
* Copyright: Microsoft 2016
*
* Timer to be used for exponential backoff.  Integrates jitter so as to not slam all services at the same time after backoffs.
*/

import assert = require('assert');

export const DEFAULT_TIME_GROW_FACTOR = 2.7182818284590451;
export const DEFAULT_TIME_JITTER = 0.11962656472;

export class ExponentialTime {
    private _currentTime: number;
    private _incrementCount: number;

    /**
     * @param initialTime  multiplier of exponent
     * @param maxTime      delays won't be greater than this
     * @param growFactor   base of exponent
     * @param jitterFactor
     */
    constructor(private _initialTime: number,
            private _maxTime: number,
            private _growFactor = DEFAULT_TIME_GROW_FACTOR,
            private _jitterFactor = DEFAULT_TIME_JITTER) {

        assert.ok(this._initialTime > 0, 'Initial delay must be positive');
        assert.ok(this._maxTime > 0, 'Delay upper bound must be positive');
        assert.ok(this._growFactor >= 0, 'Ratio must be non-negative');
        assert.ok(this._jitterFactor >= 0, 'Jitter factor must be non-negative');

        this.reset();
    }

    reset(): void {
        this._incrementCount = 0;

        // Differ from java impl -- give it some initial jitter
        this._currentTime = Math.round(this._initialTime * (1 + Math.random() * this._jitterFactor));
        // console.log('this._currentTime', this._currentTime);
    }

    getTime(): number {
        return this._currentTime;
    }

    getIncrementCount(): number {
        return this._incrementCount;
    }

    calculateNext(): number {
        // console.log('this._currentTime', this._currentTime);

        let delay = this._currentTime * this._growFactor;

        if (delay > this._maxTime) {
            delay = this._maxTime;
        }

        if (this._jitterFactor < 0.00001) {
            this._currentTime = delay;
        } else {
            this._currentTime = Math.round(Math.random() * delay * this._jitterFactor + delay);
        }

        if (this._currentTime < this._initialTime) {
            this._currentTime = this._initialTime;
        }

        if (this._currentTime > this._maxTime) {
            this._currentTime = this._maxTime;
        }

        this._incrementCount++;
        return this._currentTime;
    }

    /**
     * @return first call returns initialTime, next calls will return initialTime*growFactor^n + jitter
     */
    getTimeAndCalculateNext(): number {
        const res = this.getTime();
        this.calculateNext();
        return res;
    }
}


// const initialTime = 100;
// const maxTime = 20000;
// const growFactor = 0.1;
// const jitterFactor = 0.0001;

// // const randomValue = 0.9524610209591828;

// const exponentialTime = new ExponentialTime(initialTime, maxTime, growFactor, jitterFactor);

// console.log(exponentialTime.calculateNext());
// console.log(exponentialTime.calculateNext());
// console.log(exponentialTime.calculateNext());
// console.log(exponentialTime.calculateNext());
// console.log(exponentialTime.calculateNext());
// console.log(exponentialTime.calculateNext());
// console.log(exponentialTime.calculateNext());
// console.log(exponentialTime.calculateNext());
// console.log(exponentialTime.calculateNext());
// console.log(exponentialTime.calculateNext());
// console.log(exponentialTime.calculateNext());
// console.log(exponentialTime.calculateNext());

// // console.log(exponentialTime.getTime());
// // console.log(exponentialTime.getIncrementCount() === 2);