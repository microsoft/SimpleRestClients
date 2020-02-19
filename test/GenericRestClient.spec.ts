import * as faker from 'faker';

import { ErrorHandlingType, SimpleWebRequestBase, WebErrorResponse } from '../src/SimpleWebRequest';
import { GenericRestClient, ApiCallOptions } from '../src/GenericRestClient';

import { DETAILED_RESPONSE, REQUEST_OPTIONS, asyncTick } from './helpers';

class RestClient extends GenericRestClient { }
const BASE_URL = faker.internet.url();
const http = new RestClient(BASE_URL);

describe('GenericRestClient', () => {
    beforeAll(() => {
        jasmine.Ajax.install();
        jasmine.clock().install();
        // Run an initial request to finish feature detection - this is needed so we can directly call onLoad
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const path = '/auth';

        http.performApiGet(path)
            .then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            request.respondWith({ status: statusCode });
            return asyncTick();
        }).then(() => {
            expect(onSuccess).toHaveBeenCalled();
            jasmine.Ajax.uninstall();
            jasmine.clock().uninstall();
        });
    });

    beforeEach(() => {
        jasmine.Ajax.install();
        jasmine.clock().install();
    });
    afterEach(() => {
        jasmine.Ajax.uninstall();
        jasmine.clock().uninstall();
    });

    it('performs GET request with performApiGet ', () => {
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

        const p1 = http.performApiGet(path)
            .then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toEqual(url);
            expect(request.method).toEqual(method);
            request.respondWith({
                responseText: JSON.stringify(body),
                status: statusCode,
            });
            expect(request.status).toEqual(statusCode);
            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalledWith(body);
        });
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
        const responseParsingException = undefined;
        const response = {
            ...DETAILED_RESPONSE,
            requestHeaders: { 'Accept': 'application/json' },
            statusCode,
            method,
            body,
            url,
            responseParsingException,
        };

        const p1 = http.performApiGetDetailed(path, { contentType: 'json' })
            .promise.then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toEqual(url);
            expect(request.method).toEqual(method);

            request.respondWith({
                responseText: JSON.stringify(body),
                status: statusCode,
            });
            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalledWith(response);
        });
    });

    it('performs POST request with performApiPost ', () => {
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

        const p1 = http.performApiPost(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toEqual(url);
            expect(request.method).toEqual(method);

            request.respondWith({
                responseText: JSON.stringify(body),
                status: statusCode,
            });
            expect(request.status).toEqual(statusCode);
            expect(request.data() as any).toEqual(sendData);
            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalledWith(body);
        });
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
        const responseParsingException = undefined;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...REQUEST_OPTIONS, sendData },
            statusCode,
            method,
            body,
            url,
            responseParsingException,
        };

        const p1 = http.performApiPostDetailed(path, sendData, { contentType: 'json' })
            .promise.then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toEqual(url);
            expect(request.method).toEqual(method);

            request.respondWith({
                responseText: JSON.stringify(body),
                status: statusCode,
            });
            expect(request.status).toEqual(statusCode);
            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalledWith(response);
        });
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

        const p1 = http.performApiPut(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toEqual(url);
            expect(request.method).toEqual(method);

            request.respondWith({
                responseText: JSON.stringify(body),
                status: statusCode,
            });
            expect(request.status).toEqual(statusCode);
            expect(request.data() as any).toEqual(sendData);
            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalledWith(body);
        });
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
        const responseParsingException = undefined;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...REQUEST_OPTIONS, sendData },
            statusCode,
            method,
            body,
            url,
            responseParsingException,
        };

        const p1 = http.performApiPutDetailed(path, sendData, { contentType: 'json' })
            .promise.then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toEqual(url);
            expect(request.method).toEqual(method);

            request.respondWith({
                responseText: JSON.stringify(body),
                status: statusCode,
            });
            expect(request.status).toEqual(statusCode);
            expect(request.data() as any).toEqual(sendData);
            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalledWith(response);
        });
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

        const p1 = http.performApiPatch(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toEqual(url);
            expect(request.method).toEqual(method);

            request.respondWith({
                responseText: JSON.stringify(body),
                status: statusCode,
            });
            expect(request.status).toEqual(statusCode);
            expect(request.data() as any).toEqual(sendData);
            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalledWith(body);
        });
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
        const responseParsingException = undefined;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...REQUEST_OPTIONS, sendData },
            statusCode,
            method,
            body,
            url,
            responseParsingException,
        };

        const p1 = http.performApiPatchDetailed(path, sendData, { contentType: 'json' })
            .promise.then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toEqual(url);
            expect(request.method).toEqual(method);

            request.respondWith({
                responseText: JSON.stringify(body),
                status: statusCode,
            });
            expect(request.status).toEqual(statusCode);
            expect(request.data() as any).toEqual(sendData);
            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalledWith(response);
        });
    });

    it('performs DELETE request with performApiDelete', () => {
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'DELETE';
        const body = {};
        const path = `/delete/${faker.random.uuid()}`;
        const url = BASE_URL + path;

        const p1 = http.performApiDelete(path)
            .then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toEqual(url);
            expect(request.method).toEqual(method);
            request.respondWith({
                responseText: JSON.stringify(body),
                status: statusCode,
            });
            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalledWith(body);
        });
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
        const responseParsingException = undefined;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...REQUEST_OPTIONS, sendData },
            statusCode,
            method,
            body,
            url,
            responseParsingException,
        };

        const p1 = http.performApiDeleteDetailed(path, sendData, { contentType: 'json' })
            .promise.then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toEqual(url);
            expect(request.method).toEqual(method);

            request.respondWith({
                responseText: JSON.stringify(body),
                status: statusCode,
            });
            expect(request.data() as any).toEqual(sendData);
            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalledWith(response);
        });
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

        const p1 = http.performApiGet(path)
            .then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.requestHeaders['Authorization']).toEqual(headers['Authorization']);
            request.respondWith({ status: statusCode });
            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalled();
        });
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

        const p1 = http.performApiGet<string[]>(path)
            .then(onSuccess);

        return asyncTick().then(() => {
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toEqual(url);
            expect(request.method).toEqual(method);

            request.respondWith({
                responseText: JSON.stringify(body),
                status: statusCode,
            });
            expect(request.status).toEqual(statusCode);

            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalledWith(body.map((str: string) => str.trim()));
        });
    });

    it('blocks the request with custom method', () => {
        let blockResolver: () => void = () => undefined;
        const blockPromise = new Promise<void>((res, rej) => { blockResolver = res; });

        class Http extends GenericRestClient {
            protected _blockRequestUntil(): Promise<void>  {
                return blockPromise;
            }
        }

        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const http = new Http(BASE_URL);
        const path = '/auth';

        const p1 = http.performApiGet(path)
            .then(onSuccess);

        let request: any;
        return asyncTick().then(() => {
            request = jasmine.Ajax.requests.mostRecent();

            expect(request).toBeUndefined();
            blockResolver();

            return asyncTick();
        }).then(() => {
            request = jasmine.Ajax.requests.mostRecent();
            request.respondWith({ status: statusCode });
            return p1;
        }).then(() => {
            expect(onSuccess).toHaveBeenCalled();
        });
    });

    it('aborting request after failure w/retry', () => {
        let blockResolver: () => void = () => undefined;
        let blockPromise = new Promise<void>((res, rej) => { blockResolver = res; });

        class Http extends GenericRestClient {
            constructor(endpointUrl: string) {
                super(endpointUrl);
                this._defaultOptions.customErrorHandler = this._customErrorHandler;
                this._defaultOptions.timeout = 1;
            }
            protected _blockRequestUntil(): Promise<void> {
                return blockPromise;
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

        const resp = http.performApiGetDetailed(path);
        const p1 = resp.promise
            .then(onSuccess)
            .catch(onFailure);

        return asyncTick().then(() => {
            blockResolver();
            return asyncTick();
        }).then(() => {
            const request1 = jasmine.Ajax.requests.mostRecent();

            // Reset blockuntil so retries may block
            blockPromise = new Promise<void>((res, rej) => { blockResolver = res; });

            request1.respondWith({ status: statusCode });
            return asyncTick();
        }).then(() => {
            expect(onSuccess).not.toHaveBeenCalled();
            expect(onFailure).not.toHaveBeenCalled();

            resp.req.abort();
            return p1;
        }).then(() => {
            expect(onSuccess).not.toHaveBeenCalled();
            expect(onFailure).toHaveBeenCalled();
        });
    });

    describe('Timing related tests' , () => {
        it('failed request with retry handles multiple _respond calls', () => {
            let blockResolver: () => void = () => undefined;
            let blockPromise = new Promise<void>((res, rej) => { blockResolver = res; });

            class Http extends GenericRestClient {
                constructor(endpointUrl: string) {
                    super(endpointUrl);
                    this._defaultOptions.customErrorHandler = this._customErrorHandler;
                    this._defaultOptions.timeout = 1;
                }
                protected _blockRequestUntil(): Promise<void> {
                    return blockPromise;
                }

                protected _customErrorHandler = (): ErrorHandlingType => {
                    return ErrorHandlingType.RetryUncountedImmediately;
                };
            }

            const statusCode = 400;
            const onSuccess = jasmine.createSpy('onSuccess');
            const http = new Http(BASE_URL);
            const path = '/auth';

            const p1 = http.performApiGet(path)
                .then(onSuccess);

            return asyncTick().then(() => {
                blockResolver();
                return asyncTick();
            }).then(() => {
                const request1 = jasmine.Ajax.requests.mostRecent();

                // Reset blockuntil so retries may block
                blockPromise = new Promise<void>((res, rej) => { blockResolver = res; });

                // Store this so we're able to emulate double-request callbacks
                const onloadToCall = request1.onload as any;
                request1.respondWith({ status: statusCode });
                onloadToCall(undefined);

                return asyncTick();
            }).then(() => {
                expect(onSuccess).not.toHaveBeenCalled();
                blockResolver();

                jasmine.clock().tick(100);
                return asyncTick();
            }).then(() => {
                const request2 = jasmine.Ajax.requests.mostRecent();
                request2.respondWith({ status: 200 });
                return p1;
            }).then(() => {
                expect(onSuccess).toHaveBeenCalled();
            });
        });
    });
});
