import * as SyncTasks from 'synctasks';
import faker from 'faker';
import { fakeServer, FakeServer } from 'nise';
import { GenericRestClient } from '../../src/GenericRestClient';
import { SimpleWebRequestBase, WebErrorResponse, ErrorHandlingType } from '../../src/SimpleWebRequest';

describe('GenericRestClient#requests', () => {
    let server: FakeServer;

    beforeEach(() => server = fakeServer.create());
    afterEach(() => server.restore());

    it('blocks the request with custom method', () => {
        const blockDefer = SyncTasks.Defer<void>();

        class Http extends GenericRestClient {
            protected _blockRequestUntil() {
                return blockDefer.promise();
            }
        }

        const statusCode = 200;
        const onSuccess = jest.fn();
        const endpointUrl = faker.internet.url();
        const path = '/auth';
        const url = `${ endpointUrl }${ path }`;
        const http = new Http(endpointUrl);

        http.performApiGet(path)
            .then(onSuccess);

        expect(server.lastRequest).toBeUndefined();
        blockDefer.resolve(void 0);

        server.respondWith('GET', url, [statusCode, {}, '']);
        server.respond();
        expect(onSuccess).toHaveBeenCalled();
    });

    it('aborting request after failure w/retry', () => {
        let blockDefer = SyncTasks.Defer<void>();

        class Http extends GenericRestClient {
            constructor(_endpointUrl: string) {
                super(_endpointUrl);
                this._defaultOptions.customErrorHandler = this._customErrorHandler;
                this._defaultOptions.timeout = 1;
            }

            protected _blockRequestUntil() {
                return blockDefer.promise();
            }

            protected _customErrorHandler = (webRequest: SimpleWebRequestBase, errorResponse: WebErrorResponse) => {
                if (errorResponse.canceled) {
                    return ErrorHandlingType.DoNotRetry;
                }
                return ErrorHandlingType.RetryUncountedImmediately;
            }
        }

        const endpointUrl = faker.internet.url();
        const statusCode = 400;
        const onSuccess = jest.fn().mockName('onSuccess');
        const onFailure = jest.fn().mockName('onFailure');
        const http = new Http(endpointUrl);
        const path = '/auth';
        const url = `${ endpointUrl }${ path }`;

        const req = http.performApiGet(path)
            .then(onSuccess)
            .catch(onFailure);

        blockDefer.resolve(void 0);
        // Reset blockuntil so retries may block
        blockDefer = SyncTasks.Defer<void>();

        server.respondWith('GET', url, [statusCode, {}, '']);
        server.respond();
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onFailure).not.toHaveBeenCalled();

        // Calls abort function
        req.cancel();
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onFailure).toHaveBeenCalled();
    });
});
