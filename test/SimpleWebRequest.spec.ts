import * as faker from 'faker';
import { SimpleWebRequest } from '../src/SimpleWebRequest';
import { DETAILED_RESPONSE } from './helpers';

describe('SimpleWebRequest', () => {
    beforeEach(() => jasmine.Ajax.install());
    afterEach(() => jasmine.Ajax.uninstall());

    it('performs GET request', () => {
        const requestOptions = { contentType: 'json' };
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

    it('sends json POST request', () => {
        const sendData = {
            title: faker.name.title(),
            text: faker.lorem.text(),
        };
        const requestOptions = { sendData };
        const statusCode = 201;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'POST';
        const body = { ...sendData, id: faker.random.uuid() };
        const url = faker.internet.url();
        const response = { ...DETAILED_RESPONSE, requestOptions, statusCode, method, body, url };

        new SimpleWebRequest<string>(method, url, requestOptions)
            .start()
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({ responseText: JSON.stringify(body), status: statusCode });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(onSuccess).toHaveBeenCalledWith(response);
    })

    it('allows to set request headers', () => {
        const headers = {
            'X-Requested-With': 'XMLHttpRequest',
            'Max-Forwards': '10'
        };
        const method = 'POST';
        const url = faker.internet.url();

        new SimpleWebRequest<string>(url, method, {}, () => headers).start();

        const request = jasmine.Ajax.requests.mostRecent();

        expect(request.requestHeaders['X-Requested-With']).toEqual(headers['X-Requested-With']);
        expect(request.requestHeaders['Max-Forwards']).toEqual(headers['Max-Forwards']);
    });

    it('forbids to set Accept header', () => {
        const headers = {
            'Accept': 'application/xml',
        };
        const method = 'GET';
        const url = faker.internet.url();

        expect(
            () => new SimpleWebRequest<string>(url, method, {}, () => headers).start()
        ).toThrowError(`Don't set Accept with options.headers -- use it with the options.acceptType property`)
    })

    it('forbids to set Content-Type header', () => {
        const headers = {
            'Content-Type': 'application/xml',
        };
        const method = 'GET';
        const url = faker.internet.url();

        expect(
            () => new SimpleWebRequest<string>(url, method, {}, () => headers).start()
        ).toThrowError(`Don't set Content-Type with options.headers -- use it with the options.contentType property`)
    })

    // @TODO Add more unit tests
});
