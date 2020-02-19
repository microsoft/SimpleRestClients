/**
 * GenericRestClient.ts
 * Author: David de Regt
 * Copyright: Microsoft 2015
 *
 * Base client type for accessing RESTful services
 */

import { isString } from './utils';
import { WebRequestOptions, SimpleWebRequest, WebResponse, Headers } from './SimpleWebRequest';

export type HttpAction = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiCallOptions extends WebRequestOptions {
    backendUrl?: string;
    excludeEndpointUrl?: boolean;
    eTag?: string;
}

export interface ETagResponse<T> {
    // Indicates whether the provided ETag matched. If true, the response is undefined.
    eTagMatched?: boolean;

    // If the ETag didn't match, the response contains the updated information.
    response?: T;

    // The updated ETag value.
    eTag?: string;
}

export interface ApiCallResponse<T, TCustomOptions extends {}> {
    req: SimpleWebRequest<T, ApiCallOptions & Partial<TCustomOptions>>;
    promise: Promise<WebResponse<T, ApiCallOptions & Partial<TCustomOptions>>>;
}

export class GenericRestClient<TCustomOptions extends {} = {}> {

    protected _endpointUrl: string;

    protected _defaultOptions: ApiCallOptions = {
        excludeEndpointUrl: false,
        withCredentials: false,
        retries: 0,
    };

    constructor(endpointUrl: string) {
        this._endpointUrl = endpointUrl;
    }

    protected _performApiCall<T>(apiPath: string,
            action: HttpAction,
            objToPost: any,
            givenOptions: Partial<ApiCallOptions & TCustomOptions> = {}): ApiCallResponse<T, TCustomOptions> {

        const options: ApiCallOptions & Partial<TCustomOptions> = { ...this._defaultOptions, ...givenOptions };
        if (objToPost) {
            options.sendData = objToPost;
        }

        if (options.eTag) {
            if (!options.augmentHeaders) {
                options.augmentHeaders = {};
            }
            options.augmentHeaders['If-None-Match'] = options.eTag;
        }

        if (!options.contentType) {
            options.contentType = isString(options.sendData) ? 'form' : 'json';
        }

        const finalUrl = options.excludeEndpointUrl ? apiPath : this._endpointUrl + apiPath;

        const req = new SimpleWebRequest<T, ApiCallOptions & Partial<TCustomOptions>>(
            action,
            finalUrl,
            options,
            () => this._getHeaders(options),
            () => this._blockRequestUntil(options),
        );

        const promise = req.start().then(response => {
            this._processSuccessResponse<T>(response);
            return response;
        });

        return {
            req,
            promise,
        };
    }

    protected _getHeaders(options: ApiCallOptions & Partial<TCustomOptions>): Headers {
        // Virtual function -- No-op by default
        return {};
    }

    // Override (but make sure to call super and chain appropriately) this function if you want to add more blocking criteria.
    // Also, this might be called multiple times to check if the conditions changed
    protected _blockRequestUntil(options: ApiCallOptions & Partial<TCustomOptions>): Promise<void> | undefined {
        // No-op by default
        return undefined;
    }

    // Override this function to process any generic headers that come down with a successful response
    protected _processSuccessResponse<T>(resp: WebResponse<T, ApiCallOptions & Partial<TCustomOptions>>): void {
        // No-op by default
    }

    performApiGet<T>(apiPath: string, options?: ApiCallOptions & Partial<TCustomOptions>): Promise<T> {
        return this
            .performApiGetDetailed<T>(apiPath, options)
            .promise.then(resp => resp.body);
    }

    performApiGetDetailed<T>(apiPath: string, options?: ApiCallOptions & Partial<TCustomOptions>):
    ApiCallResponse<T, ApiCallOptions & Partial<TCustomOptions>> {
        return this._performApiCall<T>(apiPath, 'GET', undefined, options);
    }

    performApiPost<T>(apiPath: string, objToPost: any, options?: ApiCallOptions & Partial<TCustomOptions>): Promise<T> {
        return this
            .performApiPostDetailed<T>(apiPath, objToPost, options)
            .promise.then(resp => resp.body);
    }

    performApiPostDetailed<T>(apiPath: string, objToPost: any, options?: ApiCallOptions & Partial<TCustomOptions>):
    ApiCallResponse<T, ApiCallOptions & Partial<TCustomOptions>> {
        return this._performApiCall<T>(apiPath, 'POST', objToPost, options);
    }

    performApiPatch<T>(apiPath: string, objToPatch: any, options?: ApiCallOptions & Partial<TCustomOptions>): Promise<T> {
        return this
            .performApiPatchDetailed<T>(apiPath, objToPatch, options)
            .promise.then(resp => resp.body);
    }

    performApiPatchDetailed<T>(apiPath: string, objToPatch: any, options?: ApiCallOptions & Partial<TCustomOptions>):
    ApiCallResponse<T, ApiCallOptions & Partial<TCustomOptions>> {
        return this._performApiCall<T>(apiPath, 'PATCH', objToPatch, options);
    }

    performApiPut<T>(apiPath: string, objToPut: any, options?: ApiCallOptions & Partial<TCustomOptions>): Promise<T> {
        return this
            .performApiPutDetailed<T>(apiPath, objToPut, options)
            .promise.then(resp => resp.body);
    }

    performApiPutDetailed<T>(apiPath: string, objToPut: any, options?: ApiCallOptions & Partial<TCustomOptions>):
    ApiCallResponse<T, ApiCallOptions & Partial<TCustomOptions>> {
        return this._performApiCall<T>(apiPath, 'PUT', objToPut, options);
    }

    performApiDelete<T>(apiPath: string, objToDelete?: any, options?: ApiCallOptions & Partial<TCustomOptions>): Promise<T> {
        return this
            .performApiDeleteDetailed<T>(apiPath, objToDelete, options)
            .promise.then(resp => resp.body);
    }

    performApiDeleteDetailed<T>(apiPath: string, objToDelete: any, options?: ApiCallOptions & Partial<TCustomOptions>):
    ApiCallResponse<T, ApiCallOptions & Partial<TCustomOptions>> {
        return this._performApiCall<T>(apiPath, 'DELETE', objToDelete, options);
    }
}
