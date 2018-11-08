import faker from 'faker';
import { fakeServer, FakeServer } from 'nise';
import { GenericRestClient } from '../../src/GenericRestClient';

describe('GenericRestClient#response', () => {
    let server: FakeServer;

    beforeEach(() => server = fakeServer.create());
    afterEach(() => server.restore());

    it('overrides response', () => {
        class Http extends GenericRestClient {
            protected _processSuccessResponse(resp: any): void {
                resp.body = resp.body.map((str: string) => str.trim());
            }
        }
        const endpointUrl = faker.internet.url();
        const path = '/get';
        const url = `${ endpointUrl }${ path }`;

        const statusCode = 200;
        const onSuccess = jest.fn();
        const method = 'GET';
        const http = new Http(endpointUrl);
        const body = [' x ', ' y ', ' z '];

        http.performApiGet<string[]>(path).then(onSuccess);
        server.respondWith('GET', url, [
            statusCode, { 'content-type': 'application/json' }, JSON.stringify(body),
        ]);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(onSuccess).toHaveBeenCalledWith(body.map((str: string) => str.trim()));
    });
});
