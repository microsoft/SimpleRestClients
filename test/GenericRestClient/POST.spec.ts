import { fakeServer, FakeServer } from 'nise';
import { GenericRestClient } from '../../src/GenericRestClient';
import * as POST from '../fixtures/GenericRestClient/post';

class RestClient extends GenericRestClient { }
const http = new RestClient(POST.endpointUrl);

describe('GenericRestClient#POST', () => {
    let server: FakeServer;

    beforeEach(() => server = fakeServer.create());
    afterEach(() => server.restore());

    it('performs POST request with performApiPost', () => {
        const onSuccess = jest.fn();

        http.performApiPost(POST.path, POST.sendData).then(onSuccess);
        server.respondWith(...POST.respondWith);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(POST.url);
        expect(request.method).toEqual(POST.method);
        expect(request.requestBody).toEqual(JSON.stringify(POST.sendData));
        expect(onSuccess).toHaveBeenCalledWith(POST.response);
    });

    it('performs POST request with performApiPostDetailed', () => {
        const onSuccess = jest.fn();

        http.performApiPostDetailed(POST.path, POST.sendData, { contentType: 'json' }).then(onSuccess);
        server.respondWith(...POST.respondWith);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(POST.url);
        expect(request.method).toEqual(POST.method);
        expect(request.requestBody).toEqual(JSON.stringify(POST.sendData));
        expect(onSuccess).toHaveBeenCalledWith(POST.detailedResponse);
    });
});
