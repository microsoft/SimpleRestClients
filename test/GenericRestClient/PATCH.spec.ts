import { fakeServer, FakeServer } from 'nise';
import { GenericRestClient } from '../../src/GenericRestClient';
import * as PATCH from '../fixtures/GenericRestClient/patch';

class RestClient extends GenericRestClient { }
const http = new RestClient(PATCH.endpointUrl);

describe('GenericRestClient#PATCH', () => {
    let server: FakeServer;

    beforeEach(() => server = fakeServer.create());
    afterEach(() => server.restore());

    it('performs PATCH request with performApiPatch', () => {
        const onSuccess = jest.fn();

        http.performApiPatch(PATCH.path, PATCH.sendData).then(onSuccess);
        server.respondWith(...PATCH.respondWith);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(PATCH.url);
        expect(request.method).toEqual(PATCH.method);
        expect(request.requestBody).toEqual(JSON.stringify(PATCH.sendData));
        expect(onSuccess).toHaveBeenCalledWith(PATCH.response);
    });

    it('performs PATCH request with performApiPatchDetailed', () => {
        const onSuccess = jest.fn();

        http.performApiPatchDetailed(PATCH.path, PATCH.sendData, { contentType: 'json' }).then(onSuccess);
        server.respondWith(...PATCH.respondWith);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(PATCH.url);
        expect(request.method).toEqual(PATCH.method);
        expect(request.requestBody).toEqual(JSON.stringify(PATCH.sendData));
        expect(onSuccess).toHaveBeenCalledWith(PATCH.detailedResponse);
    });
});
