import * as SyncTasks from 'synctasks';
import faker from 'faker';
import { fakeServer, FakeServer } from 'nise';
import { SimpleWebRequest } from '../../src/SimpleWebRequest';

describe('SimpleWebRequest#headers', () => {
    let server: FakeServer;
    let spyConsole: jest.Mock;
    let catchExceptions = false;

    beforeEach(() => {
        catchExceptions = SyncTasks.config.catchExceptions;
        SyncTasks.config.catchExceptions = false;
        server = fakeServer.create();
        spyConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        SyncTasks.config.catchExceptions = catchExceptions;
        server.restore();
        spyConsole.mockRestore();
    });

    it('allows to set request headers', () => {
        const headers = {
            'X-Requested-With': 'XMLHttpRequest',
            'Max-Forwards': '10',
        };
        const statusCode = 200;
        const method = 'POST';
        const url = faker.internet.url();

        new SimpleWebRequest<string>(url, method, {}, () => headers).start();
        server.respondWith('POST', url, [statusCode, {}, '']);
        server.respond();

        const request = server.lastRequest!;
        expect(request).toBeDefined();
        expect(request.requestHeaders['X-Requested-With']).toEqual(headers['X-Requested-With']);
        expect(request.requestHeaders['Max-Forwards']).toEqual(headers['Max-Forwards']);
    });

    it('forbids to set Accept header', () => {
        const headers = {
            Accept: 'application/xml',
        };
        const method = 'GET';
        const url = faker.internet.url();
        const error = `Don't set Accept with options.headers -- use it with the options.acceptType property`;
        const request = new SimpleWebRequest<string>(url, method, {}, () => headers);

        expect(() => request.start()).toThrowError(error);
        expect(console.error).toHaveBeenCalledWith(error);
    });

    it('forbids to set Content-Type header', () => {
        const headers = {
            'Content-Type': 'application/xml',
        };
        const method = 'GET';
        const url = faker.internet.url();
        const error = `Don't set Content-Type with options.headers -- use it with the options.contentType property`;
        const request = new SimpleWebRequest<string>(url, method, {}, () => headers);

        expect(() => request.start()).toThrowError(error);
        expect(console.error).toHaveBeenCalledWith(error);
    });
});
