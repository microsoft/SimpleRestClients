import faker from 'faker';
import { requestOptions, JSONAcceptHeader, JSONContentTypeHeader } from '../common';

export const endpointUrl = faker.internet.url();
export const id = faker.random.uuid();
export const path = `/post/${ faker.random.uuid() }`;
export const url = `${ endpointUrl }${ path }`;
export const sendData = { title: faker.name.title(), text: faker.lorem.text() };
export const body = { ...sendData, id };
export const method = 'POST';
export const headers = { 'content-type': 'application/json' };
export const statusCode = 201;
export const respondWith = [method, url, [statusCode, headers, JSON.stringify(body)]];

/**
 * Successful responses
 */
export const response = body;
export const detailedResponse = {
    requestOptions: { ...requestOptions, sendData },
    requestHeaders: { ...JSONAcceptHeader, ...JSONContentTypeHeader },
    statusText: 'Created',
    statusCode,
    headers,
    method,
    body,
    url,
};
