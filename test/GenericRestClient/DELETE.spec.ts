import { fakeServer, FakeServer } from 'nise';
import { GenericRestClient } from '../../src/GenericRestClient';
import * as DELETE from '../fixtures/GenericRestClient/delete';

class RestClient extends GenericRestClient { }
const http = new RestClient(DELETE.endpointUrl);

describe('GenericRestClient#DELETE', () => {
    let server: FakeServer;

    beforeEach(() => server = fakeServer.create());
    afterEach(() => server.restore());

    it('performs DELETE request with performApiDelete', () => {
        const onSuccess = jest.fn();

        http.performApiDelete(DELETE.path, DELETE.sendData).then(onSuccess);
        server.respondWith(...DELETE.respondWith);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(DELETE.url);
        expect(request.method).toEqual(DELETE.method);
        expect(request.requestBody).toEqual(JSON.stringify(DELETE.sendData));
        expect(onSuccess).toHaveBeenCalledWith(DELETE.response);
    });

    it('performs DELETE request with performApiDeleteDetailed', () => {
        const onSuccess = jest.fn();

        http.performApiDeleteDetailed(DELETE.path, DELETE.sendData, { contentType: 'json' }).then(onSuccess);
        server.respondWith(...DELETE.respondWith);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(DELETE.url);
        expect(request.method).toEqual(DELETE.method);
        expect(request.requestBody).toEqual(JSON.stringify(DELETE.sendData));
        expect(onSuccess).toHaveBeenCalledWith(DELETE.detailedResponse);
    });
});
