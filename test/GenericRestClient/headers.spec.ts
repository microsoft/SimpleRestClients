import faker from 'faker';
import { fakeServer, FakeServer } from 'nise';
import { GenericRestClient, ApiCallOptions } from '../../src/GenericRestClient';

describe('GenericRestClient#headers', () => {
    let server: FakeServer;

    beforeEach(() => server = fakeServer.create());
    afterEach(() => server.restore());

    it('performs request with custom headers', () => {
        const headers = {
            Authorization: `Barrier ${ faker.random.uuid() }`,
        };

        class Http extends GenericRestClient {
            protected _getHeaders(options: ApiCallOptions): { [header: string]: string } {
                return headers;
            }
        }

        const statusCode = 200;
        const onSuccess = jest.fn();
        const endpointUrl = faker.internet.url();
        const path = '/auth';
        const url = `${ endpointUrl }${ path }`;
        const http = new Http(endpointUrl);

        http.performApiGet(path).then(onSuccess);
        server.respondWith('GET', url, [statusCode, {}, '']);
        server.respond();

        expect(server.lastRequest!.requestHeaders.Authorization).toEqual(headers.Authorization);
        expect(onSuccess).toHaveBeenCalled();
    });
});
