import * as faker from 'faker';
import { ErrorHandlingType, SimpleWebRequestBase, WebErrorResponse } from '../src/SimpleWebRequest';
import { GenericRestClient, ApiCallOptions } from '../src/GenericRestClient';
import { DETAILED_RESPONSE, REQUEST_OPTIONS } from './helpers';
import * as SyncTasks from 'synctasks';

class RestClient extends GenericRestClient { }
const BASE_URL = faker.internet.url();
const http = new RestClient(BASE_URL);

describe('GenericRestClient', () => {
    beforeAll(() => {
        jasmine.Ajax.install();
        // Run an initial request to finish feature detection - this is needed so we can directly call onLoad
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const path = '/auth';

        http.performApiGet(path)
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({ status: statusCode });
        expect(onSuccess).toHaveBeenCalled();
        jasmine.Ajax.uninstall();
    });

    beforeEach(() => jasmine.Ajax.install());
    afterEach(() => jasmine.Ajax.uninstall());

    it('performs GET request with performApiGet', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'GET';
        const body = {
            title: faker.name.title(),
            text: faker.lorem.text(),
            id,
        };
        const path = `/get/${id}`;
        const url = BASE_URL + path;

        http.performApiGet(path)
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(onSuccess).toHaveBeenCalledWith(body);
    });

    it('performs GET request with performApiGetDetailed', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'GET';
        const body = {
            title: faker.name.title(),
            text: faker.lorem.text(),
            id,
        };
        const path = `/get/${id}`;
        const url = BASE_URL + path;
        const response = {
            ...DETAILED_RESPONSE,
            requestHeaders: { 'Accept': 'application/json' },
            statusCode,
            method,
            body,
            url,
        };

        http.performApiGetDetailed(path, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('performs POST request with performApiPost', () => {
        const statusCode = 201;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'POST';
        const sendData = {
            title: faker.name.title(),
            text: faker.lorem.text(),
        };
        const body = { ...sendData, id: faker.random.uuid() };
        const path = '/post';
        const url = BASE_URL + path;

        http.performApiPost(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(request.data() as any).toEqual(sendData);
        expect(onSuccess).toHaveBeenCalledWith(body);
    });

    it('performs POST request with performApiPostDetailed', () => {
        const statusCode = 201;
        const onSuccess = jasmine.createSpy('onSuccess');
        const sendData = {
            title: faker.name.title(),
            text: faker.lorem.text(),
        };
        const method = 'POST';
        const body = { ...sendData, id: faker.random.uuid() };
        const path = '/post';
        const url = BASE_URL + path;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...REQUEST_OPTIONS, sendData },
            statusCode,
            method,
            body,
            url,
        };

        http.performApiPostDetailed(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('performs PUT request with performApiPut', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const sendData = { title: faker.name.title() };
        const method = 'PUT';
        const body = { ...sendData, id };
        const path = '/put/' + id;
        const url = BASE_URL + path;

        http.performApiPut(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(request.data() as any).toEqual(sendData);
        expect(onSuccess).toHaveBeenCalledWith(body);
    });

    it('performs PUT request with performApiPutDetailed', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const sendData = { title: faker.name.title() };
        const method = 'PUT';
        const body = { ...sendData, id: faker.random.uuid() };
        const path = `/patch/${id}`;
        const url = BASE_URL + path;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...REQUEST_OPTIONS, sendData },
            statusCode,
            method,
            body,
            url,
        };

        http.performApiPutDetailed(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(request.data() as any).toEqual(sendData);
        expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('performs PATCH request with performApiPatch', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'PATCH';
        const sendData = {
            title: faker.name.title(),
            text: faker.lorem.text(),
        };
        const body = { ...sendData, text: faker.lorem.text(), id };
        const path = '/patch' + id;
        const url = BASE_URL + path;

        http.performApiPatch(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(request.data() as any).toEqual(sendData);
        expect(onSuccess).toHaveBeenCalledWith(body);
    });

    it('performs PATCH request with performApiPatchDetailed', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const sendData = {
            title: faker.name.title(),
            text: faker.lorem.text(),
        };
        const method = 'PATCH';
        const body = { ...sendData, id: faker.random.uuid() };
        const path = `/patch/${id}`;
        const url = BASE_URL + path;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...REQUEST_OPTIONS, sendData },
            statusCode,
            method,
            body,
            url,
        };

        http.performApiPatchDetailed(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(request.data() as any).toEqual(sendData);
        expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('performs DELETE request with performApiDelete', () => {
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'DELETE';
        const body = {};
        const path = `/delete/${faker.random.uuid()}`;
        const url = BASE_URL + path;

        http.performApiDelete(path)
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(onSuccess).toHaveBeenCalledWith(body);
    });

    it('performs DELETE request with performApiDeleteDetailed', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const sendData = { id };
        const method = 'DELETE';
        const body = {};
        const path = `/delete/${id}`;
        const url = BASE_URL + path;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...REQUEST_OPTIONS, sendData },
            statusCode,
            method,
            body,
            url,
        };

        http.performApiDeleteDetailed(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.data() as any).toEqual(sendData);
        expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('performs request with custom headers', () => {
        const headers = {
            'Authorization': `Barrier ${faker.random.uuid()}`,
        };

        class Http extends GenericRestClient {
            protected _getHeaders(options: ApiCallOptions): { [header: string]: string } {
                return headers;
            }
        }
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const http = new Http(BASE_URL);
        const path = '/auth';

        http.performApiGet(path)
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({ status: statusCode });

        expect(request.requestHeaders['Authorization']).toEqual(headers['Authorization']);
        expect(onSuccess).toHaveBeenCalled();
    });

    it('overrides response', () => {
        class Http extends GenericRestClient {
            protected _processSuccessResponse(resp: any): void {
                resp.body = resp.body.map((str: string) => str.trim());
            }
        }
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'GET';
        const http = new Http(BASE_URL);
        const path = '/get';
        const body = [' x ', ' y ', ' z '];
        const url = BASE_URL + path;

        http.performApiGet<string[]>(path)
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(onSuccess).toHaveBeenCalledWith(body.map((str: string) => str.trim()));
    });

    it('blocks the request with custom method', () => {
        const blockDefer = SyncTasks.Defer<void>();

        class Http extends GenericRestClient {
            protected _blockRequestUntil(): SyncTasks.Promise<void>  {
                return blockDefer.promise();
            }
        }

        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const http = new Http(BASE_URL);
        const path = '/auth';

        http.performApiGet(path)
            .then(onSuccess);

        let request = jasmine.Ajax.requests.mostRecent();

        expect(request).toBeUndefined();
        blockDefer.resolve(void 0);

        request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({ status: statusCode });
        expect(onSuccess).toHaveBeenCalled();
    });

    it('aborting request after failure w/retry', () => {
        let blockDefer = SyncTasks.Defer<void>();

        class Http extends GenericRestClient {
            constructor(endpointUrl: string) {
                super(endpointUrl);
                this._defaultOptions.customErrorHandler = this._customErrorHandler;
                this._defaultOptions.timeout = 1;
            }
            protected _blockRequestUntil(): SyncTasks.Promise<void> {
                return blockDefer.promise();
            }

            protected _customErrorHandler = (webRequest: SimpleWebRequestBase, errorResponse: WebErrorResponse): ErrorHandlingType => {
                if (errorResponse.canceled) {
                    return ErrorHandlingType.DoNotRetry;
                }
                return ErrorHandlingType.RetryUncountedImmediately;
            };
        }

        const statusCode = 400;
        const onSuccess = jasmine.createSpy('onSuccess');
        const onFailure = jasmine.createSpy('onFailure');
        const http = new Http(BASE_URL);
        const path = '/auth';

        const req = http.performApiGet(path)
            .then(onSuccess)
            .catch(onFailure);

        blockDefer.resolve(void 0);
        const request1 = jasmine.Ajax.requests.mostRecent();

        // Reset blockuntil so retries may block
        blockDefer = SyncTasks.Defer<void>();

        request1.respondWith({ status: statusCode });
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onFailure).not.toHaveBeenCalled();

        // Calls abort function
        req.cancel();

        expect(onSuccess).not.toHaveBeenCalled();
        expect(onFailure).toHaveBeenCalled();
    });

    describe('Timing related tests' , () => {
        beforeEach(() => {
            jasmine.clock().install();
        });

        afterEach(() => {
            jasmine.clock().uninstall();
        });

        it('failed request with retry handles multiple _respond calls', () => {
            let blockDefer = SyncTasks.Defer<void>();

            class Http extends GenericRestClient {
                constructor(endpointUrl: string) {
                    super(endpointUrl);
                    this._defaultOptions.customErrorHandler = this._customErrorHandler;
                    this._defaultOptions.timeout = 1;
                }
                protected _blockRequestUntil(): SyncTasks.Promise<void> {
                    return blockDefer.promise();
                }

                protected _customErrorHandler = (): ErrorHandlingType => {
                    return ErrorHandlingType.RetryUncountedImmediately;
                };
            }

            const statusCode = 400;
            const onSuccess = jasmine.createSpy('onSuccess');
            const http = new Http(BASE_URL);
            const path = '/auth';

            http.performApiGet(path)
                .then(onSuccess);

            blockDefer.resolve(void 0);
            const request1 = jasmine.Ajax.requests.mostRecent();

            // Reset blockuntil so retries may block
            blockDefer = SyncTasks.Defer<void>();

            // Store this so we're able to emulate double-request callbacks
            const onloadToCall = request1.onload as any;
            request1.respondWith({ status: statusCode });
            onloadToCall(undefined);
            expect(onSuccess).not.toHaveBeenCalled();
            blockDefer.resolve(void 0);

            jasmine.clock().tick(100);

            const request2 = jasmine.Ajax.requests.mostRecent();
            request2.respondWith({ status: 200 });
            expect(onSuccess).toHaveBeenCalled();
        });
    });
});
