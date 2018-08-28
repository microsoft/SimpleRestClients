import * as faker from 'faker';
import { SimpleWebRequest, SimpleWebRequestOptions, WebRequestPriority, test_resetQueues } from '../src/SimpleWebRequest';
import { DETAILED_RESPONSE } from './helpers';
import * as SyncTasks from 'synctasks';

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
    })

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
    })

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
        const headers = {
            'Accept': 'application/xml',
        };
        const method = 'GET';
        const url = faker.internet.url();

        expect(
            () => new SimpleWebRequest<string>(url, method, {}, () => headers).start()
        ).toThrowError(`Don't set Accept with options.headers -- use it with the options.acceptType property`)
        test_resetQueues();
    })

    it('forbids to set Content-Type header', () => {
        const headers = {
            'Content-Type': 'application/xml',
        };
        const method = 'GET';
        const url = faker.internet.url();

        expect(
            () => new SimpleWebRequest<string>(url, method, {}, () => headers).start()
        ).toThrowError(`Don't set Content-Type with options.headers -- use it with the options.contentType property`)
        test_resetQueues();
    })

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
            const onSuccess1 = jasmine.createSpy('onSuccess1');
            const onSuccess2 = jasmine.createSpy('onSuccess2');
            const onSuccess3 = jasmine.createSpy('onSuccess3');
            const onSuccess4 = jasmine.createSpy('onSuccess4');
            const status = 200;
    
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Low }).start().then(onSuccess1);
            jasmine.clock().tick(10);
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Critical }).start().then(onSuccess2);
            jasmine.clock().tick(10);
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Low }).start().then(onSuccess3);
            jasmine.clock().tick(10);
            
            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            // add a new request to kick the queue
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Critical }).start().then(onSuccess4);
            
            // only one is executed
            expect(jasmine.Ajax.requests.count()).toBe(1);
            jasmine.Ajax.requests.mostRecent().respondWith({status});
            // they're executed in correct order
            expect(onSuccess2).toHaveBeenCalled();

            jasmine.Ajax.requests.mostRecent().respondWith({status});
            expect(onSuccess4).toHaveBeenCalled();

            jasmine.Ajax.requests.mostRecent().respondWith({status});
            expect(onSuccess1).toHaveBeenCalled();

            jasmine.Ajax.requests.mostRecent().respondWith({status});
            expect(onSuccess3).toHaveBeenCalled();
        });
    
        it('blocks the request with custom promise', () => {
            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            const url = faker.internet.url();
            const method = 'GET';
            const blockDefer = SyncTasks.Defer<void>();
            const onSuccess1 = jasmine.createSpy('onSuccess1');
            new SimpleWebRequest<string>(url, method,{}, undefined, () => blockDefer.promise()).start().then(onSuccess1);

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
            const onSuccess1 = jasmine.createSpy('onSuccess1');
            const onSuccess2 = jasmine.createSpy('onSuccess2');
            const onSuccess3 = jasmine.createSpy('onSuccess3');

            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.High }, undefined, () => blockDefer.promise()).start().then(onSuccess1);
            jasmine.clock().tick(10);
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Low }).start().then(onSuccess2);
            jasmine.clock().tick(10);

            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            // add a new request to kick the queue
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Critical }).start().then(onSuccess3);
            
            // unblock the request
            blockDefer.resolve(void 0);

            jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            // first the critical one gets sent
            expect(onSuccess3).toHaveBeenCalled();

            // then the high, which was returned to the queue at after getting unblocked
            jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            expect(onSuccess1).toHaveBeenCalled();

            // and the low priority one gets sent last 
            jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            expect(onSuccess2).toHaveBeenCalled();
        });
        
        it('checks the blocked function again, once the request is on top of the queue', () => {
            const url = faker.internet.url();
            const method = 'GET';
            const blockDefer = SyncTasks.Defer<void>();
            const onSuccess1 = jasmine.createSpy('onSuccess1');
            const onSuccess2 = jasmine.createSpy('onSuccess2');
            const onSuccess3 = jasmine.createSpy('onSuccess3');
            const blockSpy = jasmine.createSpy('blockSpy').and.callFake(() => blockDefer.promise());

            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Critical }, undefined, blockSpy).start().then(onSuccess1);
            jasmine.clock().tick(10);
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.High }).start().then(onSuccess2);
            jasmine.clock().tick(10);

            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            // add a new request to kick the queue
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.High }).start().then(onSuccess3);
            
            expect(blockSpy).toHaveBeenCalled();

            jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            expect(onSuccess2).toHaveBeenCalled();

            // unblock the request
            blockDefer.resolve(void 0);

            jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            expect(onSuccess3).toHaveBeenCalled();

            // check if the request at the top of the queue got called again
            expect(blockSpy).toHaveBeenCalledTimes(2);

            jasmine.Ajax.requests.mostRecent().respondWith({ status: 200 });
            expect(onSuccess1).toHaveBeenCalled();
        });

        it('fails the request, if the blocking promise rejects', done => {
            SimpleWebRequestOptions.MaxSimultaneousRequests = 1;
            const url = faker.internet.url();
            const method = 'GET';
            const blockDefer = SyncTasks.Defer<void>();
            const onSuccess1 = jasmine.createSpy('onSuccess1');
            new SimpleWebRequest<string>(url, method, { priority: WebRequestPriority.Critical }, undefined, () => blockDefer.promise()).start().then(onSuccess1).catch(err => {
                expect(1).toBe(1);
                done();
            });
            
            blockDefer.reject('Terrible error');

        });
    });

    // @TODO Add more unit tests
});
