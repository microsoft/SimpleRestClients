import { ExponentialTime, DEFAULT_TIME_JITTER, DEFAULT_TIME_GROW_FACTOR } from '../src/ExponentialTime';

const LOW_JITTER_FACTOR = 0.000001;
const RANDOM_VALUE = 0.9524610209591828;
const INITIAL_TIME = 50;
const GROW_FACTOR = 0.1;
const MAX_TIME = 2000;

const normilizeTimeRange = (time: number): number => {
    if (time < INITIAL_TIME) {
        return INITIAL_TIME;
    }

    if (time > MAX_TIME) {
        return MAX_TIME;
    }

    return time;
};

const calculateExponentialTime = (currentTime: number, growFactor: number, jitterFactor: number): number => {
    const delay = currentTime * growFactor;
    return normilizeTimeRange(Math.round(RANDOM_VALUE * delay * jitterFactor + delay));
};

const calculateDefaultExponentialTime = (initialTime: number, jitterFactor: number): number => (
    Math.round(initialTime * (1 + RANDOM_VALUE * jitterFactor))
);

describe('ExponentialTime', () => {
    beforeAll(() => {
        spyOn(Math, 'random').and.returnValue(RANDOM_VALUE);
    });

    it('calculates time with default grow and jitter factor', () => {
        const exponentialTime = new ExponentialTime(INITIAL_TIME, MAX_TIME);

        let currentTime = calculateDefaultExponentialTime(INITIAL_TIME, DEFAULT_TIME_JITTER);
        expect(exponentialTime.getTime()).toEqual(currentTime);
        expect(exponentialTime.getIncrementCount()).toEqual(0);

        currentTime = exponentialTime.getTime();
        exponentialTime.calculateNext();
        expect(exponentialTime.getTime()).toEqual(calculateExponentialTime(currentTime, DEFAULT_TIME_GROW_FACTOR, DEFAULT_TIME_JITTER));
        expect(exponentialTime.getIncrementCount()).toEqual(1);

        currentTime = exponentialTime.getTime();
        exponentialTime.calculateNext();
        expect(exponentialTime.getTime()).toEqual(calculateExponentialTime(currentTime, DEFAULT_TIME_GROW_FACTOR, DEFAULT_TIME_JITTER));
        expect(exponentialTime.getIncrementCount()).toEqual(2);
    });

    it('calculates time with low jitter factor', () => {
        const exponentialTime = new ExponentialTime(INITIAL_TIME, MAX_TIME, GROW_FACTOR, LOW_JITTER_FACTOR);

        expect(exponentialTime.getTime()).toEqual(calculateDefaultExponentialTime(INITIAL_TIME, LOW_JITTER_FACTOR));
        expect(exponentialTime.getIncrementCount()).toEqual(0);

        exponentialTime.calculateNext();
        expect(exponentialTime.getTime()).toEqual(normilizeTimeRange(exponentialTime.getTime() * GROW_FACTOR));
        expect(exponentialTime.getIncrementCount()).toEqual(1);

        exponentialTime.calculateNext();
        expect(exponentialTime.getTime()).toEqual(normilizeTimeRange(exponentialTime.getTime() * GROW_FACTOR));
        expect(exponentialTime.getIncrementCount()).toEqual(2);
    });

    it('calculates next time and returns previous time', () => {
        const exponentialTime = new ExponentialTime(INITIAL_TIME, MAX_TIME);

        let currentTime = exponentialTime.getTime();
        expect(currentTime).toEqual(exponentialTime.getTimeAndCalculateNext());
        expect(exponentialTime.getIncrementCount()).toEqual(1);

        currentTime = exponentialTime.getTime();
        expect(currentTime).toEqual(exponentialTime.getTimeAndCalculateNext());
        expect(exponentialTime.getIncrementCount()).toEqual(2);
    });

    it('resets time', () => {
        const exponentialTime = new ExponentialTime(INITIAL_TIME, MAX_TIME);
        const defaultTime = exponentialTime.getTime();

        exponentialTime.calculateNext();
        exponentialTime.calculateNext();
        exponentialTime.calculateNext();
        exponentialTime.reset();

        expect(defaultTime).toEqual(exponentialTime.getTime());
        expect(exponentialTime.getIncrementCount()).toEqual(0);
    });

    it('checks correct initial values', () => {
        expect(() => new ExponentialTime(0, 0)).toThrowError('Initial delay must be positive');
        expect(() => new ExponentialTime(INITIAL_TIME, 0)).toThrowError('Delay upper bound must be positive');

        expect(() => new ExponentialTime(INITIAL_TIME, MAX_TIME, -1))
            .toThrowError('Ratio must be non-negative');
        expect(() => new ExponentialTime(INITIAL_TIME, MAX_TIME, DEFAULT_TIME_JITTER, -1))
            .toThrowError('Jitter factor must be non-negative');
    });
});
