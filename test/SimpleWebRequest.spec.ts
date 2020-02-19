import * as faker from 'faker';

import {
    ErrorHandlingType,
    SimpleWebRequest,
    SimpleWebRequestOptions,
    WebErrorResponse,
    WebRequestPriority,
} from '../src/SimpleWebRequest';

import { asyncTick, DETAILED_RESPONSE } from './helpers';

describe('SimpleWebRequest', () => {
    beforeEach(() => {
        jasmine.Ajax.install();
    });
    afterEach(() => {
        jasmine.Ajax.uninstall();
    });

    it('performs GET request', () => {
        const requestOptions = { contentType: 'json' };
        const requestHeaders = { 'Accept': 'application/json' };
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'GET';
        const url = faker.internet.url();
        const responseParsingException = undefined;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...requestOptions, priority: WebRequestPriority.Normal },
            requestHeaders,
            method,
            url,
            responseParsingException,
        };

        let request: any;
        setTimeout(() => {
            request = jasmine.Ajax.requests.mostRecent();
            request.respondWith({ responseText: JSON.stringify(''), status: statusCode });
        }, 0);

        return new SimpleWebRequest<string>(method, url, requestOptions)
            .start()
            .then(onSuccess)
            .then(() => {
                expect(request.url).toEqual(url);
                expect(request.method).toEqual(method);
                expect(request.status).toEqual(statusCode);
                expect(onSuccess).toHaveBeenCalledWith(response);
            });
    });

    it('sends json POST request', () => {
        const sendData = {
            title: faker.name.title(),
            text: faker.lorem.text(),
        };
        const requestOptions = { sendData };
        const statusCode = 201;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'POST';
        const body = { ...sendData, id: faker.random.uuid() };
        const url = faker.internet.url();
        const responseParsingException = undefined;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...requestOptions, priority: WebRequestPriority.Normal },
            statusCode,
            method,
            body,
            url,
            responseParsingException,
        };

        let request: any;
        setTimeout(() => {
            request = jasmine.Ajax.requests.mostRecent();
            request.respondWith({ responseText: JSON.stringify(body), status: statusCode });
        }, 0);

        return new SimpleWebRequest<string>(method, url, requestOptions)
            .start()
            .then(onSuccess)
            .then(() => {
                expect(request.url).toEqual(url);
                expect(request.method).toEqual(method);
                expect(request.status).toEqual(statusCode);
                expect(onSuccess).toHaveBeenCalledWith(response);
            });
    });

    it('allows to set request headers', () => {
        const headers = {
            'X-Requested-With': 'XMLHttpRequest',
            'Max-Forwards': '10',
        };
        const method = 'POST';
        const url = faker.internet.url();

        let request: any;
        setTimeout(() => {
            request = jasmine.Ajax.requests.mostRecent();
            request.respondWith({ status: 200 });
        }, 0);

        return new SimpleWebRequest<string>(method, url, {}, () => headers).start().then(() => {
            expect(request.requestHeaders['X-Requested-With']).toEqual(headers['X-Requested-With']);
            expect(request.requestHeaders['Max-Forwards']).toEqual(headers['Max-Forwards']);
        });
    });

    it('forbids to set Accept header', () => {
        spyOn(console, 'error');

        const headers = {
            'Accept': 'application/xml',
        };
        const method = 'GET';
        const url = faker.internet.url();
        const error = `Don't set Accept with options.headers -- use it with the options.acceptType property`;
        const request = new SimpleWebRequest<string>(method, url, {}, () => headers);

        request.start().then(() => {
            expect(false).toBeTrue();
        }, err => {
            expect(err).toEqual(error);
            expect(console.error).toHaveBeenCalledWith(error);
        });
    });

    it('forbids to set Content-Type header', () => {
        spyOn(console, 'error');

        const headers = {
            'Content-Type': 'application/xml',
        };
        const method = 'GET';
        const url = faker.internet.url();
        const error = `Don't set Content-Type with options.headers -- use it with the options.contentType property`;
        const request = new SimpleWebRequest<string>(method, url, {}, () => headers);

        request.start().then(() => {
            expect(false).toBeTrue();
        }, err => {
            expect(err).toEqual(error);
            expect(console.error).toHaveBeenCalledWith(error);
        });
    });

    describe('blocking', () => {
        let maxRequests = 0;

        beforeEach(() => {
            maxRequests = SimpleWebRequestOptions.MaxSimultaneousRequests;
            SimpleWebRequestOptions.MaxSimultaneousRequests = 0;
            jasmine.clock().install();
        });

        afterEach(() => {
            SimpleWebRequestOptions.MaxSimultaneousRequests = maxRequests;
            jasmine.clock().uninstall();
        });

        it('executes the requests by priority and age', () => {
            const url = faker.internet.url();
            const method = 'GET';
            const onSuccessLow1 = jasmine.createSpy('onSuccessLow1');
            const onSuccessCritical1 = jasmine.createSpy('onSuccessCritical1');
            const onSuccessLow2 = jasmine.createSpy('onSuccessLow2');
            const onSuccessCritical2 = jasmine.createSpy('onSuccessCritical2');
            const status = 200;

            const p1 = new SimpleWebRequest<string>(method, url, { priority: WebRequestPriority.Low })
                .start().then(onSuccessLow1);
            jasmine.clock().tick(10);

            const p2 = new SimpleWebRequest<string>(method, url, { priority: WebRequestPriority.Critical })
                .start().then(onSuccessCritical1);
            jasmine.clock().tick(10);

            const p3 = new SimpleWebRequest<string>(method, url, { priority: WebRequestPriority.Low })
                .start().then(onSuccessLow2);
            jasmine.clock().tick(10);

            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            // add a new request to kick the queue
            const p4 = new SimpleWebRequest<string>(method, url, { priority: WebRequestPriority.Critical })
                .start().then(onSuccessCritical2);

            asyncTick().then(() => {
                // only one is executed
                expect(jasmine.Ajax.requests.count()).toBe(1);
                jasmine.Ajax.requests.mostRecent().respondWith({status});
            });

            return p2.then(() => {
                // they're executed in correct order
                expect(onSuccessCritical1).toHaveBeenCalled();
                jasmine.Ajax.requests.mostRecent().respondWith({status});

                return p4;
            }).then(() => {
                expect(onSuccessCritical2).toHaveBeenCalled();
                jasmine.Ajax.requests.mostRecent().respondWith({status});

                return p1;
            }).then(() => {
                expect(onSuccessLow1).toHaveBeenCalled();
                jasmine.Ajax.requests.mostRecent().respondWith({status});

                return p3;
            }).then(() => {
                expect(onSuccessLow2).toHaveBeenCalled();
            });
        });

        it('blocks the request with custom promise', () => {
            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            const url = faker.internet.url();
            const method = 'GET';
            let blockResolver: () => void = () => undefined;
            const blockPromise = new Promise<void>((res, rej) => { blockResolver = res; });
            const onSuccess1 = jasmine.createSpy('onSuccess1');
            const p1 = new SimpleWebRequest<string>(method, url, {}, undefined, () => blockPromise).start().then(onSuccess1);

            asyncTick().then(() => {
                expect(jasmine.Ajax.requests.count()).toBe(0);
                blockResolver();

                return asyncTick();
            }).then(() => {
                const request = jasmine.Ajax.requests.mostRecent();
                request.respondWith({ status: 200 });
            });

            return p1.then(() => {
                expect(onSuccess1).toHaveBeenCalled();
            });
        });

        it('after the request is unblocked, it\'s returned to the queue with correct priority', () => {
            const url = faker.internet.url();
            const method = 'GET';
            let blockResolver: () => void = () => undefined;
            const blockPromise = new Promise<void>((res, rej) => { blockResolver = res; });
            const onSuccessHigh = jasmine.createSpy('onSuccessHigh');
            const onSuccessLow = jasmine.createSpy('onSuccessLow');
            const onSuccessCritical = jasmine.createSpy('onSuccessCritical');

            const p1 = new SimpleWebRequest<string>(method, url, { priority: WebRequestPriority.High }, undefined, () => blockPromise)
                .start()
                .then(onSuccessHigh);
            jasmine.clock().tick(10);
            const p2 = new SimpleWebRequest<string>(method, url, { priority: WebRequestPriority.Low }).start().then(onSuccessLow);
            jasmine.clock().tick(10);

            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            // add a new request to kick the queue
            const p3 = new SimpleWebRequest<string>(method, url, { priority: WebRequestPriority.Critical }).start().then(onSuccessCritical);

            // unblock the request
            blockResolver();

            // have to do an awkward async tick to get the blocking blocker to resolve before the request goes out
            asyncTick().then(() => {
                jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            });

            return p3.then(() => {
                // first the critical one gets sent
                expect(onSuccessCritical).toHaveBeenCalled();

                // then the high, which was returned to the queue at after getting unblocked
                jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });

                return p1;
            }).then(() => {
                expect(onSuccessHigh).toHaveBeenCalled();

                // and the low priority one gets sent last
                jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });

                return p2;
            }).then(() => {
                expect(onSuccessLow).toHaveBeenCalled();
            });
        });

        it('checks the blocked function again, once the request is on top of the queue', () => {
            const url = faker.internet.url();
            const method = 'GET';
            let blockResolver: () => void = () => undefined;
            const blockPromise = new Promise<void>((res, rej) => { blockResolver = res; });
            const onSuccessCritical = jasmine.createSpy('onSuccessCritical');
            const onSuccessHigh = jasmine.createSpy('onSuccessHigh');
            const onSuccessHigh2 = jasmine.createSpy('onSuccessHigh2');
            const blockSpy = jasmine.createSpy('blockSpy').and.callFake(() => blockPromise);

            const p1 = new SimpleWebRequest<string>(method, url, { priority: WebRequestPriority.Critical }, undefined, blockSpy)
                .start()
                .then(onSuccessCritical);
            jasmine.clock().tick(10);

            const p2 = new SimpleWebRequest<string>(method, url, { priority: WebRequestPriority.High }).start().then(onSuccessHigh);
            jasmine.clock().tick(10);

            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            // add a new request to kick the queue
            const p3 = new SimpleWebRequest<string>(method, url, { priority: WebRequestPriority.High }).start().then(onSuccessHigh2);

            asyncTick().then(() => {
                expect(blockSpy).toHaveBeenCalled();
                jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            });

            return p2.then(() => {
                expect(onSuccessHigh).toHaveBeenCalled();

                // unblock the request, it will go back to the queue after the currently executed request
                blockResolver();

                jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });

                return p3;
            }).then(() => {
                expect(onSuccessHigh2).toHaveBeenCalled();

                jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });

                return p1;
            }).then(() => {
                expect(onSuccessCritical).toHaveBeenCalled();
            });
        });

        it('fails the request, if the blocking promise rejects', done => {
            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            const url = faker.internet.url();
            const method = 'GET';
            let blockRejecter: (err: any) => void = () => undefined;
            const blockPromise = new Promise<void>((res, rej) => { blockRejecter = rej; });
            const errorString = 'Terrible error';
            new SimpleWebRequest<string>(method, url, { priority: WebRequestPriority.Critical }, undefined, () => blockPromise)
                .start()
                .then(() => fail(), (err: WebErrorResponse) => {
                    expect(err.statusCode).toBe(0);
                    expect(err.statusText).toBe('_blockRequestUntil rejected: ' + errorString);
                    done();
                });

            blockRejecter(errorString);
        });

        it('does not attempt to fire aborted request, if it was aborted while blocked', () => {
            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            const url = faker.internet.url();
            const method = 'GET';
            let blockResolver: () => void = () => undefined;
            const blockPromise = new Promise<void>((res, rej) => { blockResolver = res; });
            const req = new SimpleWebRequest<string>(method, url, { priority: WebRequestPriority.Critical }, undefined, () => blockPromise);
            req.start();
            req.abort();

            blockResolver();
            expect(jasmine.Ajax.requests.count()).toBe(0);
        });
    });

    describe('retries', () => {
        beforeEach(() => {
            jasmine.clock().install();
        });

        afterEach(() => {
            jasmine.clock().uninstall();
        });

        it('fails the request with "timedOut: true" if it times out without retries', done => {
            const url = faker.internet.url();
            const method = 'GET';
            new SimpleWebRequest<string>(method, url, { timeout: 10, customErrorHandler: () => ErrorHandlingType.DoNotRetry })
                .start()
                .then(() => {
                    expect(false).toBeTruthy();
                    done();
                })
                .catch(errResp => {
                    expect(errResp.timedOut).toBeTruthy();
                    done();
                });

            asyncTick().then(() => {
                jasmine.clock().tick(10);
            });
        });

        it('timedOut flag is reset on retry', done => {
            const url = faker.internet.url();
            const method = 'GET';
            const req = new SimpleWebRequest<string>(method, url, {
                timeout: 10,
                retries: 1,
                customErrorHandler: () => ErrorHandlingType.RetryCountedWithBackoff,
            });
            const requestPromise = req.start();

            requestPromise
                .then(() => {
                    expect(false).toBeTruthy();
                    done();
                })
                .catch(errResp => {
                    expect(errResp.canceled).toBeTruthy();
                    expect(errResp.timedOut).toBeFalsy();
                    done();
                });

            // first try will time out, the second one will be aborted
            asyncTick().then(() => {
                jasmine.clock().tick(10);
                req.abort();
            });
        });
    });

    // @TODO Add more unit tests
});
