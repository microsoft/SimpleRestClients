import * as faker from 'faker';
import { GenericRestClient, ApiCallOptions } from '../src/GenericRestClient';
import { DETAILED_RESPONSE, REQUEST_OPTIONS } from './helpers';

class RestClient extends GenericRestClient { }
const BASE_URL = faker.internet.url();
const http = new RestClient(BASE_URL);

describe('GenericRestClient', () => {
    beforeEach(() => jasmine.Ajax.install());
    afterEach(() => jasmine.Ajax.uninstall());

    it('performs GET request with performApiGet', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'GET';
        const body = {
            title: faker.name.title(),
            text: faker.lorem.text(),
            id,
        };
        const path = `/get/${id}`;
        const url = BASE_URL + path;

        http.performApiGet(path)
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(onSuccess).toHaveBeenCalledWith(body);
    });

    it('performs GET request with performApiGetDetailed', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'GET';
        const body = {
            title: faker.name.title(),
            text: faker.lorem.text(),
            id,
        };
        const path = `/get/${id}`;
        const url = BASE_URL + path;
        const response = {
            ...DETAILED_RESPONSE,
            requestHeaders: { 'Accept': 'application/json' },
            statusCode,
            method,
            body,
            url
        };

        http.performApiGetDetailed(path, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('performs POST request with performApiPost', () => {
        const statusCode = 201;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'POST';
        const sendData = {
            title: faker.name.title(),
            text: faker.lorem.text(),
        };
        const body = { ...sendData, id: faker.random.uuid() };
        const path = '/post';
        const url = BASE_URL + path;

        http.performApiPost(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(request.data() as any).toEqual(sendData);
        expect(onSuccess).toHaveBeenCalledWith(body);
    });

    it('performs POST request with performApiPostDetailed', () => {
        const statusCode = 201;
        const onSuccess = jasmine.createSpy('onSuccess');
        const sendData = {
            title: faker.name.title(),
            text: faker.lorem.text(),
        };
        const method = 'POST';
        const body = { ...sendData, id: faker.random.uuid() };
        const path = '/post';
        const url = BASE_URL + path;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...REQUEST_OPTIONS, sendData },
            statusCode,
            method,
            body,
            url
        };

        http.performApiPostDetailed(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('performs PUT request with performApiPut', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const sendData = { title: faker.name.title() };
        const method = 'PUT';
        const body = { ...sendData, id };
        const path = '/put/' + id;
        const url = BASE_URL + path;

        http.performApiPut(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(request.data() as any).toEqual(sendData);
        expect(onSuccess).toHaveBeenCalledWith(body);
    });

    it('performs PUT request with performApiPutDetailed', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const sendData = { title: faker.name.title() };
        const method = 'PUT';
        const body = { ...sendData, id: faker.random.uuid() };
        const path = `/patch/${id}`;
        const url = BASE_URL + path;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...REQUEST_OPTIONS, sendData },
            statusCode,
            method,
            body,
            url
        };

        http.performApiPutDetailed(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(request.data() as any).toEqual(sendData);
        expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('performs PATCH request with performApiPatch', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'PATCH';
        const sendData = {
            title: faker.name.title(),
            text: faker.lorem.text(),
        };
        const body = { ...sendData, text: faker.lorem.text(), id };
        const path = '/patch' + id;
        const url = BASE_URL + path;

        http.performApiPatch(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(request.data() as any).toEqual(sendData);
        expect(onSuccess).toHaveBeenCalledWith(body);
    });

    it('performs PATCH request with performApiPatchDetailed', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const sendData = {
            title: faker.name.title(),
            text: faker.lorem.text(),
        };
        const method = 'PATCH';
        const body = { ...sendData, id: faker.random.uuid() };
        const path = `/patch/${id}`;
        const url = BASE_URL + path;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...REQUEST_OPTIONS, sendData },
            statusCode,
            method,
            body,
            url
        };

        http.performApiPatchDetailed(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(request.data() as any).toEqual(sendData);
        expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('performs DELETE request with performApiDelete', () => {
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'DELETE';
        const body = {};
        const path = `/delete/${faker.random.uuid()}`;
        const url = BASE_URL + path;

        http.performApiDelete(path)
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(onSuccess).toHaveBeenCalledWith(body);
    });

    it('performs DELETE request with performApiDeleteDetailed', () => {
        const id = faker.random.uuid();
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const sendData = { id };
        const method = 'DELETE';
        const body = {};
        const path = `/delete/${id}`;
        const url = BASE_URL + path;
        const response = {
            ...DETAILED_RESPONSE,
            requestOptions: { ...REQUEST_OPTIONS, sendData },
            statusCode,
            method,
            body,
            url,
        };

        http.performApiDeleteDetailed(path, sendData, { contentType: 'json' })
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.data() as any).toEqual(sendData);
        expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it('performs request with custum headers', () => {
        const headers = {
            'Authorization': `Barrier ${faker.random.uuid()}`,
        };

        class Http extends GenericRestClient {
            protected _getHeaders(options: ApiCallOptions): { [header: string]: string } {
                return headers;
            }
        }
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const http = new Http(BASE_URL);
        const path = '/auth';

        http.performApiGet(path)
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({ status: statusCode });

        expect(request.requestHeaders['Authorization']).toEqual(headers['Authorization']);
        expect(onSuccess).toHaveBeenCalled();
    });

    it('overrides response', () => {
        class Http extends GenericRestClient {
            protected _processSuccessResponse<T>(resp: any): void {
                resp.body = resp.body.map((str: string) => str.trim());
            }
        }
        const statusCode = 200;
        const onSuccess = jasmine.createSpy('onSuccess');
        const method = 'GET';
        const http = new Http(BASE_URL);
        const path = '/get';
        const body = [' x ', ' y ', ' z '];
        const url = BASE_URL + path;

        http.performApiGet<string[]>(path)
            .then(onSuccess);

        const request = jasmine.Ajax.requests.mostRecent();
        request.respondWith({
            responseText: JSON.stringify(body),
            status: statusCode,
        });

        expect(request.url).toEqual(url);
        expect(request.method).toEqual(method);
        expect(request.status).toEqual(statusCode);
        expect(onSuccess).toHaveBeenCalledWith(body.map((str: string) => str.trim()));
    });
});
