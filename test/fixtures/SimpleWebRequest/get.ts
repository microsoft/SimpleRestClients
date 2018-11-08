import faker from 'faker';
import { JSONAcceptHeader } from '../common';

export const endpointUrl = faker.internet.url();
export const id = faker.random.uuid();
export const path = `/get/${ faker.random.uuid() }`;
export const url = `${ endpointUrl }${ path }`;
export const body = { title: faker.name.title(), text: faker.lorem.text(), id };
export const method = 'GET';
export const headers = { 'content-type': 'application/json' };
export const statusCode = 200;
export const respondWith = [method, url, [statusCode, headers, JSON.stringify(body)]];
export const requestOptions = { contentType: 'json' };

/**
 * Successful responses
 */
export const detailedResponse = {
    requestOptions,
    requestHeaders: JSONAcceptHeader,
    statusText: 'OK',
    statusCode,
    headers,
    method,
    body,
    url,
};
