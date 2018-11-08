import { fakeServer, FakeServer } from 'nise';
import { GenericRestClient } from '../../src/GenericRestClient';
import * as PUT from '../fixtures/GenericRestClient/put';

class RestClient extends GenericRestClient { }
const http = new RestClient(PUT.endpointUrl);

describe('GenericRestClient#PUT', () => {
    let server: FakeServer;

    beforeEach(() => server = fakeServer.create());
    afterEach(() => server.restore());

    it('performs PUT request with performApiPut', () => {
        const onSuccess = jest.fn();

        http.performApiPut(PUT.path, PUT.sendData).then(onSuccess);
        server.respondWith(...PUT.respondWith);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(PUT.url);
        expect(request.method).toEqual(PUT.method);
        expect(request.requestBody).toEqual(JSON.stringify(PUT.sendData));
        expect(onSuccess).toHaveBeenCalledWith(PUT.response);
    });

    it('performs PUT request with performApiPutDetailed', () => {
        const onSuccess = jest.fn();

        http.performApiPutDetailed(PUT.path, PUT.sendData, { contentType: 'json' }).then(onSuccess);
        server.respondWith(...PUT.respondWith);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(PUT.url);
        expect(request.method).toEqual(PUT.method);
        expect(request.requestBody).toEqual(JSON.stringify(PUT.sendData));
        expect(onSuccess).toHaveBeenCalledWith(PUT.detailedResponse);
    });
});
