import faker from 'faker';
import { requestOptions, JSONAcceptHeader, JSONContentTypeHeader } from '../common';

export const endpointUrl = faker.internet.url();
export const id = faker.random.uuid();
export const path = `/put/${ faker.random.uuid() }`;
export const url = `${ endpointUrl }${ path }`;
export const sendData = { title: faker.name.title() };
export const body = { ...sendData };
export const method = 'PUT';
export const headers = { 'content-type': 'application/json' };
export const statusCode = 200;
export const respondWith = [method, url, [statusCode, headers, JSON.stringify(body)]];

/**
 * Successful responses
 */
export const response = body;
export const detailedResponse = {
    requestOptions: { ...requestOptions, sendData },
    requestHeaders: { ...JSONAcceptHeader, ...JSONContentTypeHeader },
    statusText: 'OK',
    statusCode,
    headers,
    method,
    body,
    url,
};
