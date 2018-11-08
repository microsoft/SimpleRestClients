import { fakeServer, FakeServer } from 'nise';
import { GenericRestClient } from '../../src/GenericRestClient';
import * as GET from '../fixtures/GenericRestClient/get';

class RestClient extends GenericRestClient { }
const http = new RestClient(GET.endpointUrl);

describe('GenericRestClient#GET', () => {
    let server: FakeServer;

    beforeEach(() => server = fakeServer.create());
    afterEach(() => server.restore());

    it('performs GET request with performApiGet', () => {
        const onSuccess = jest.fn();

        http.performApiGet(GET.path).then(onSuccess);
        server.respondWith(...GET.respondWith);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(GET.url);
        expect(request.method).toEqual(GET.method);
        expect(onSuccess).toHaveBeenCalledWith(GET.response);
    });

    it('performs GET request with performApiGetDetailed', () => {
        const onSuccess = jest.fn();

        http.performApiGetDetailed(GET.path, { contentType: 'json' }).then(onSuccess);
        server.respondWith(...GET.respondWith);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(GET.url);
        expect(request.method).toEqual(GET.method);
        expect(onSuccess).toHaveBeenCalledWith(GET.detailedResponse);
    });
});
