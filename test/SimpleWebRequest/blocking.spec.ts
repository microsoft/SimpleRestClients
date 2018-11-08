import * as SyncTasks from 'synctasks';
import faker from 'faker';
import { fakeServer, FakeServer } from 'nise';
import { SimpleWebRequest, SimpleWebRequestOptions, WebRequestPriority, WebErrorResponse } from '../../src/SimpleWebRequest';

describe('SimpleWebRequest#blocking', () => {
    let server: FakeServer ;
    let maxRequests = 0;

    beforeEach(() => {
        maxRequests = SimpleWebRequestOptions.MaxSimultaneousRequests;
        SimpleWebRequestOptions.MaxSimultaneousRequests = 0;
        server = fakeServer.create();
    });

    afterEach(() => {
        SimpleWebRequestOptions.MaxSimultaneousRequests = maxRequests;
        server.restore();
    });

    it('executes the requests by priority and age', () => {
        const method = 'GET';
        const onSuccessLow1 = jest.fn().mockName('onSuccessLow1');
        const onSuccessCritical1 = jest.fn().mockName('onSuccessCritical1');
        const onSuccessLow2 = jest.fn().mockName('onSuccessLow2');
        const onSuccessCritical2 = jest.fn().mockName('onSuccessCritical2');
        const statusCode = 200;

        new SimpleWebRequest<string>(faker.internet.url(), method, { priority: WebRequestPriority.Low })
            .start()
            .then(onSuccessLow1);

        new SimpleWebRequest<string>(faker.internet.url(), method, { priority: WebRequestPriority.Critical })
            .start()
            .then(onSuccessCritical1);

        new SimpleWebRequest<string>(faker.internet.url(), method, { priority: WebRequestPriority.Low })
            .start()
            .then(onSuccessLow2);

        SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
        // add a new request to kick the queue
        new SimpleWebRequest<string>(faker.internet.url(), method, { priority: WebRequestPriority.Critical })
            .start()
            .then(onSuccessCritical2);

        // // only one is executed
        expect(server.requests.length).toBe(1);

        // they're executed in correct order
        server.lastRequest!.respond(statusCode);
        expect(onSuccessCritical1).toHaveBeenCalled();

        server.lastRequest!.respond(statusCode);
        expect(onSuccessCritical2).toHaveBeenCalled();

        server.lastRequest!.respond(statusCode);
        expect(onSuccessLow1).toHaveBeenCalled();

        server.lastRequest!.respond(statusCode);
        expect(onSuccessLow2).toHaveBeenCalled();
    });

    it('blocks the request with custom promise', () => {
        SimpleWebRequestOptions.MaxSimultaneousRequests = 1;

        const statusCode = 200;
        const url = faker.internet.url();
        const method = 'GET';
        const blockDefer = SyncTasks.Defer<void>();
        const onSuccess = jest.fn().mockName('onSuccess1');

        new SimpleWebRequest<string>(url, method, {}, undefined, () => blockDefer.promise())
            .start()
            .then(onSuccess);

        expect(server.requests.length).toBe(0);
        blockDefer.resolve(void 0);

        server.lastRequest!.respond(statusCode);
        expect(onSuccess).toHaveBeenCalled();
    });

    it('after the request is unblocked, it\'s returned to the queue with correct priority', () => {
        const statusCode = 200;
        const method = 'GET';
        const blockDefer = SyncTasks.Defer<void>();
        const onSuccessHigh = jest.fn().mockName('onSuccessHigh');
        const onSuccessLow = jest.fn().mockName('onSuccessLow');
        const onSuccessCritical = jest.fn().mockName('onSuccessCritical');

        new SimpleWebRequest<string>(
            faker.internet.url(), method, { priority: WebRequestPriority.High }, undefined, () => blockDefer.promise(),
        ).start().then(onSuccessHigh);

        new SimpleWebRequest<string>(faker.internet.url(), method, { priority: WebRequestPriority.Low })
            .start()
            .then(onSuccessLow);

        SimpleWebRequestOptions.MaxSimultaneousRequests = 1;

        // add a new request to kick the queue
        new SimpleWebRequest<string>(faker.internet.url(), method, { priority: WebRequestPriority.Critical })
            .start()
            .then(onSuccessCritical);

        // unblock the request
        blockDefer.resolve(void 0);

        server.lastRequest!.respond(statusCode);
        // first the critical one gets sent
        expect(onSuccessCritical).toHaveBeenCalled();

        // then the high, which was returned to the queue at after getting unblocked
        server.lastRequest!.respond(statusCode);
        expect(onSuccessHigh).toHaveBeenCalled();

        // and the low priority one gets sent last
        server.lastRequest!.respond(statusCode);
        expect(onSuccessLow).toHaveBeenCalled();
    });

    it('checks the blocked function again, once the request is on top of the queue', () => {
        const statusCode = 200;
        const method = 'GET';
        const blockDefer = SyncTasks.Defer<void>();
        const onSuccessCritical = jest.fn().mockName('onSuccessCritical');
        const onSuccessHigh = jest.fn().mockName('onSuccessHigh');
        const onSuccessHigh2 = jest.fn().mockName('onSuccessHigh2');
        const blockSpy = jest.fn().mockImplementation(() => blockDefer.promise()).mockName('blockSpy');

        new SimpleWebRequest<string>(faker.internet.url(), method, { priority: WebRequestPriority.Critical }, undefined, blockSpy)
            .start()
            .then(onSuccessCritical);

        new SimpleWebRequest<string>(faker.internet.url(), method, { priority: WebRequestPriority.High })
            .start()
            .then(onSuccessHigh);

        SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
        // add a new request to kick the queue
        new SimpleWebRequest<string>(faker.internet.url(), method, { priority: WebRequestPriority.High })
            .start()
            .then(onSuccessHigh2);

        expect(blockSpy).toHaveBeenCalled();

        server.lastRequest!.respond(statusCode);
        expect(onSuccessHigh).toHaveBeenCalled();

        // unblock the request, it will go back to the queue after the currently executed request
        blockDefer.resolve(void 0);

        server.lastRequest!.respond(statusCode);
        expect(onSuccessHigh2).toHaveBeenCalled();

        // check if the request at the top of the queue got called again
        expect(blockSpy).toHaveBeenCalledTimes(2);

        server.lastRequest!.respond(statusCode);
        expect(onSuccessCritical).toHaveBeenCalled();
    });

    it('fails the request, if the blocking promise rejects', (done) => {
        SimpleWebRequestOptions.MaxSimultaneousRequests = 1;

        const url = faker.internet.url();
        const method = 'GET';
        const blockDefer = SyncTasks.Defer<void>();
        const errorString = 'Terrible error';

        new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Critical }, undefined, () => blockDefer.promise())
            .start()
            .then(() => fail(), (err: WebErrorResponse) => {
                expect(err.statusCode).toBe(0);
                expect(err.statusText).toBe(`_blockRequestUntil rejected: ${ errorString }`);
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
        expect(server.requests.length).toBe(0);
    });
});
