import * as SyncTasks from 'synctasks';
import faker from 'faker';
import { fakeServer, FakeServer } from 'nise';
import { GenericRestClient } from '../../src/GenericRestClient';
import { ErrorHandlingType } from '../../src/SimpleWebRequest';

describe('GenericRestClient#request', () => {
    let server: FakeServer;

    beforeEach(() => server = fakeServer.create());
    afterEach(() => server.restore());

    it('failed request with retry handles multiple _respond calls', () => {
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

            protected _customErrorHandler = () => {
                return ErrorHandlingType.RetryUncountedImmediately;
            }
        }

        const statusCode400 = 400;
        const statusCode200 = 200;
        const onSuccess = jest.fn();
        const endpointUrl = faker.internet.url();
        const path = '/auth';
        const http = new Http(endpointUrl);

        http.performApiGet(path)
                .then(onSuccess);

        blockDefer.resolve(void 0);
        const request1 = server.lastRequest!;

        // Reset blockuntil so retries may block
        blockDefer = SyncTasks.Defer<void>();

        // Store this so we're able to emulate double-request callbacks
        const onloadToCall = request1.onload as any;
        request1.respond(statusCode400);
        onloadToCall(undefined);
        expect(onSuccess).not.toHaveBeenCalled();
        blockDefer.resolve(void 0);

        const request = server.lastRequest!;
        expect(request).toBeDefined();

        request.respond(statusCode200);
        expect(onSuccess).toHaveBeenCalled();
    });
});
