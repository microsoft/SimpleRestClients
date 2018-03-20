export const REQUEST_OPTIONS = {
  excludeEndpointUrl: false,
  withCredentials: false,
  contentType: 'json',
  priority: 2,
  retries: 0,
};

export const REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export const DETAILED_RESPONSE = {
  requestOptions: REQUEST_OPTIONS,
  requestHeaders: REQUEST_HEADERS,
  statusCode: 200,
  statusText: undefined,
  headers: {
    'content-type': 'application/json',
  },
  body: '',
  url: '',
};
