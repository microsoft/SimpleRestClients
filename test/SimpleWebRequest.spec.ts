import * as faker from 'faker';
import * as SyncTasks from 'synctasks';
import { SimpleWebRequest, SimpleWebRequestOptions, WebErrorResponse, WebRequestPriority } from '../src/SimpleWebRequest';
import { DETAILED_RESPONSE } from './helpers';

describe('SimpleWebRequest', () => {
    let catchExceptions = false;
    const status = 200;

    beforeEach(() => {
        catchExceptions = SyncTasks.config.catchExceptions;
        SyncTasks.config.catchExceptions = false;
        jasmine.Ajax.install();
    });
    afterEach(() => {
        SyncTasks.config.catchExceptions = catchExceptions;
        jasmine.Ajax.uninstall();
    });

    it('performs GET request', () => {
        const requestOptions = { contentType: 'json' };
        const requestHeaders = { 'Accept': 'application/json' };
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'GET';
        const url = faker.internet.url();
        const response = { ...DETAILED_RESPONSE, requestOptions, requestHeaders, method, url };

        new SimpleWebRequest<string>(method, url, requestOptions)
            .start()
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({ responseText: JSON.stringify(''), status: statusCode });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('sends json POST request', () => {
        const sendData = {
            title: faker.name.title(),
            text: faker.lorem.text()
        };
        const requestOptions = { sendData };
        const statusCode = 201;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'POST';
        const body = { ...sendData, id: faker.random.uuid() };
        const url = faker.internet.url();
        const response = { ...DETAILED_RESPONSE, requestOptions, statusCode, method, body, url };

        new SimpleWebRequest<string>(method, url, requestOptions)
            .start()
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({ responseText: JSON.stringify(body), status: statusCode });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('allows to set request headers', () => {
        const headers = {
            'X-Requested-With': 'XMLHttpRequest',
            'Max-Forwards': '10'
        };
        const method = 'POST';
        const url = faker.internet.url();

        new SimpleWebRequest<string>(url, method, {}, () => headers).start();

        const request = jasmine.Ajax.requests.mostRecent();

        expect(request.requestHeaders['X-Requested-With']).toEqual(headers['X-Requested-With']);
        expect(request.requestHeaders['Max-Forwards']).toEqual(headers['Max-Forwards']);

        request.respondWith({ status });
    });

    it('forbids to set Accept header', () => {
        spyOn(console, 'error');

        const headers = {
            'Accept': 'application/xml'
        };
        const method = 'GET';
        const url = faker.internet.url();
        const error = `Don't set Accept with options.headers -- use it with the options.acceptType property`;
        const request = new SimpleWebRequest<string>(url, method, {}, () => headers);

        expect(() => request.start()).toThrowError(error);
        expect(console.error).toHaveBeenCalledWith(error);
    });

    it('forbids to set Content-Type header', () => {
        spyOn(console, 'error');

        const headers = {
            'Content-Type': 'application/xml'
        };
        const method = 'GET';
        const url = faker.internet.url();
        const error = `Don't set Content-Type with options.headers -- use it with the options.contentType property`;
        const request = new SimpleWebRequest<string>(url, method, {}, () => headers);

        expect(() => request.start()).toThrowError(error);
        expect(console.error).toHaveBeenCalledWith(error);
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

            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Low }).start().then(onSuccessLow1);
            jasmine.clock().tick(10);

            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Critical }).start().then(onSuccessCritical1);
            jasmine.clock().tick(10);

            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Low }).start().then(onSuccessLow2);
            jasmine.clock().tick(10);

            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            // add a new request to kick the queue
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Critical }).start().then(onSuccessCritical2);

            // only one is executed
            expect(jasmine.Ajax.requests.count()).toBe(1);
            jasmine.Ajax.requests.mostRecent().respondWith({status});
            // they're executed in correct order
            expect(onSuccessCritical1).toHaveBeenCalled();

            jasmine.Ajax.requests.mostRecent().respondWith({status});
            expect(onSuccessCritical2).toHaveBeenCalled();

            jasmine.Ajax.requests.mostRecent().respondWith({status});
            expect(onSuccessLow1).toHaveBeenCalled();

            jasmine.Ajax.requests.mostRecent().respondWith({status});
            expect(onSuccessLow2).toHaveBeenCalled();
        });

        it('blocks the request with custom promise', () => {
            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            const url = faker.internet.url();
            const method = 'GET';
            const blockDefer = SyncTasks.Defer<void>();
            const onSuccess1 = jasmine.createSpy('onSuccess1');
            new SimpleWebRequest<string>(url, method, {}, undefined, () => blockDefer.promise()).start().then(onSuccess1);

            expect(jasmine.Ajax.requests.count()).toBe(0);
            blockDefer.resolve(void 0);

            const request = jasmine.Ajax.requests.mostRecent();
            request.respondWith({ status: 200 });
            expect(onSuccess1).toHaveBeenCalled();
        });

        it('after the request is unblocked, it\'s returned to the queue with correct priority', () => {
            const url = faker.internet.url();
            const method = 'GET';
            const blockDefer = SyncTasks.Defer<void>();
            const onSuccessHigh = jasmine.createSpy('onSuccessHigh');
            const onSuccessLow = jasmine.createSpy('onSuccessLow');
            const onSuccessCritical = jasmine.createSpy('onSuccessCritical');

            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.High }, undefined, () => blockDefer.promise())
                .start()
                .then(onSuccessHigh);
            jasmine.clock().tick(10);
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Low }).start().then(onSuccessLow);
            jasmine.clock().tick(10);

            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            // add a new request to kick the queue
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Critical }).start().then(onSuccessCritical);

            // unblock the request
            blockDefer.resolve(void 0);

            jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            // first the critical one gets sent
            expect(onSuccessCritical).toHaveBeenCalled();

            // then the high, which was returned to the queue at after getting unblocked
            jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            expect(onSuccessHigh).toHaveBeenCalled();

            // and the low priority one gets sent last
            jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            expect(onSuccessLow).toHaveBeenCalled();
        });

        it('checks the blocked function again, once the request is on top of the queue', () => {
            const url = faker.internet.url();
            const method = 'GET';
            const blockDefer = SyncTasks.Defer<void>();
            const onSuccessCritical = jasmine.createSpy('onSuccessCritical');
            const onSuccessHigh = jasmine.createSpy('onSuccessHigh');
            const onSuccessHigh2 = jasmine.createSpy('onSuccessHigh2');
            const blockSpy = jasmine.createSpy('blockSpy').and.callFake(() => blockDefer.promise());

            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Critical }, undefined, blockSpy)
                .start()
                .then(onSuccessCritical);
            jasmine.clock().tick(10);

            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.High }).start().then(onSuccessHigh);
            jasmine.clock().tick(10);

            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            // add a new request to kick the queue
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.High }).start().then(onSuccessHigh2);

            expect(blockSpy).toHaveBeenCalled();

            jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            expect(onSuccessHigh).toHaveBeenCalled();

            // unblock the request, it will go back to the queue after the currently executed request
            blockDefer.resolve(void 0);

            jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            expect(onSuccessHigh2).toHaveBeenCalled();

            // check if the request at the top of the queue got called again
            expect(blockSpy).toHaveBeenCalledTimes(2);

            jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            expect(onSuccessCritical).toHaveBeenCalled();
        });

        it('fails the request, if the blocking promise rejects', done => {
            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            const url = faker.internet.url();
            const method = 'GET';
            const blockDefer = SyncTasks.Defer<void>();
            const errorString = 'Terrible error';
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Critical }, undefined, () => blockDefer.promise())
                .start()
                .then(() => fail(), (err: WebErrorResponse) => {
                    expect(err.statusCode).toBe(0);
                    expect(err.statusText).toBe('_blockRequestUntil rejected: ' + errorString);
                    done();
                });

            blockDefer.reject(errorString);
        });

        it('does not attempt to fire aborted request, if it was aborted while blocked', () => {
            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            const url = faker.internet.url();
            const method = 'GET';
            const blockDefer = SyncTasks.Defer<void>();
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Critical }, undefined, () => blockDefer.promise())
                .start()
                .cancel();

            blockDefer.resolve(void 0);
            expect(jasmine.Ajax.requests.count()).toBe(0);

        });
    });

    // @TODO Add more unit tests
});
