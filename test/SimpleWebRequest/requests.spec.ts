import { fakeServer, FakeServer } from 'nise';
import { SimpleWebRequest } from '../../src/SimpleWebRequest';
import * as GET from '../fixtures/SimpleWebRequest/get';
import * as POST from '../fixtures/SimpleWebRequest/post';

describe('SimpleWebRequest#request', () => {
    let server: FakeServer;

    beforeEach(() => server = fakeServer.create());
    afterEach(() => server.restore());

    it('performs GET request', () => {
        const onSuccess = jest.fn();

        new SimpleWebRequest<string>(GET.method, GET.url, GET.requestOptions)
            .start()
            .then(onSuccess);

        server.respondWith(...GET.respondWith);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(GET.url);
        expect(request.method).toEqual(GET.method);
        expect(request.status).toEqual(GET.statusCode);
        expect(onSuccess).toHaveBeenCalledWith(GET.detailedResponse);
    });

    it('sends json POST request', () => {
        const onSuccess = jest.fn();

        new SimpleWebRequest<string>(POST.method, POST.url, POST.requestOptions)
            .start()
            .then(onSuccess);

        server.respondWith(...POST.respondWith);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.url).toEqual(POST.url);
        expect(request.method).toEqual(POST.method);
        expect(request.status).toEqual(POST.statusCode);
        expect(onSuccess).toHaveBeenCalledWith(POST.detailedResponse);
    });
});
