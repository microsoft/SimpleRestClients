import faker from 'faker';
import { requestOptions, JSONContentTypeHeader, JSONAcceptHeader } from '../common';

export const endpointUrl = faker.internet.url();
export const id = faker.random.uuid();
export const path = `/delete/${ faker.random.uuid() }`;
export const url = `${ endpointUrl }${ path }`;
export const sendData = { id };
export const body = {};
export const method = 'DELETE';
export const headers = { 'content-type': 'application/json' };
export const statusCode = 200;
export const respondWith = [method, url, [statusCode, headers, JSON.stringify(body)]];

/**
 * Successful responses
 */
export const response = body;
export const detailedResponse = {
    requestOptions: { ...requestOptions, sendData },
    requestHeaders: { ...JSONContentTypeHeader, ...JSONAcceptHeader },
    statusText: 'OK',
    statusCode,
    headers,
    method,
    body,
    url,
};
