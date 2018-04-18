import * as faker from 'faker';
import { SimpleWebRequest } from '../src/SimpleWebRequest';
import { DETAILED_RESPONSE } from './helpers';

describe('SimpleWebRequest', () => {
    beforeEach(() => jasmine.Ajax.install());
    afterEach(() => jasmine.Ajax.uninstall());

    it('performs simple request', () => {
        const requestOptions = { priority: 0, contentType: 'json' };
        const requestHeaders = { 'Accept': 'application/json' };
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'GET';
        const url = faker.internet.url();
        const response = { ...DETAILED_RESPONSE, requestOptions, requestHeaders, method, url };

        new SimpleWebRequest<string>(method, url, requestOptions)
            .start()
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({ responseText: JSON.stringify(''), status: statusCode });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(onSuccess).toHaveBeenCalledWith(response);
    })

    // @TODO ...
});