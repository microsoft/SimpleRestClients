/**
* GenericRestClient.ts
* Author: David de Regt
* Copyright: Microsoft 2015
*
* Base client type for accessing RESTful services
*/

import _ = require('lodash');
import SyncTasks = require('synctasks');
import {
    WebRequestOptions,
    WebResponse,
    Headers,
    SimpleWebRequest,
} from './SimpleWebRequest';

export type HttpAction = 'POST'|'GET'|'PUT'|'DELETE'|'PATCH';

export interface ApiCallOptions extends WebRequestOptions {
    excludeEndpointUrl?: boolean;
    backendUrl?: string;
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

export class GenericRestClient {

    protected _endpointUrl: string;

    protected _defaultOptions: ApiCallOptions = {
        excludeEndpointUrl: false,
        withCredentials: false,
        retries: 0,
    };

    constructor(endpointUrl: string) {
        this._endpointUrl = endpointUrl;
    }

    protected _performApiCall<ResponseBody>(apiPath: string, action: HttpAction, objToPost: any, givenOptions?: ApiCallOptions)
            : SyncTasks.Promise<WebResponse<ResponseBody, ApiCallOptions>> {

        let options = _.defaults<ApiCallOptions, ApiCallOptions, ApiCallOptions>({}, givenOptions || {}, this._defaultOptions);
        if (objToPost) {
            options.sendData = objToPost;
        }

        const promise = this._blockRequestUntil(options);
        if (!promise) {
            return this._performApiCallInternal(apiPath, action, options);
        }

        return promise.then(() => this._performApiCallInternal(apiPath, action, options));
    }

    private _performApiCallInternal<ResponseBody>(apiPath: string, action: HttpAction, options: ApiCallOptions)
            : SyncTasks.Promise<WebResponse<ResponseBody, ApiCallOptions>> {

        if (options.eTag) {
            if (!options.augmentHeaders) {
                options.augmentHeaders = {};
            }
            options.augmentHeaders['If-None-Match'] = options.eTag;
        }

        if (!options.contentType) {
            options.contentType = _.isString(options.sendData) ? 'form' : 'json';
        }

        const finalUrl = options.excludeEndpointUrl ? apiPath : this._endpointUrl + apiPath;

        return new SimpleWebRequest<ResponseBody, ApiCallOptions>(action, finalUrl, options, () => this._getHeaders(options))
            .start()
            .then(response => {
                this._processSuccessResponse<ResponseBody>(response);
                return response;
            });
    }

    protected _getHeaders(options: ApiCallOptions): Headers {
        // Virtual function -- No-op by default
        return {};
    }

    // Override (but make sure to call super and chain appropriately) this function if you want to add more blocking criteria.
    protected _blockRequestUntil(options: ApiCallOptions): SyncTasks.Promise<void>|undefined {
        // No-op by default
        return undefined;
    }

    // Override this function to process any generic headers that come down with a successful response
    protected _processSuccessResponse<ResponseBody>(resp: WebResponse<ResponseBody, ApiCallOptions>): void {
        // No-op by default
    }

    performApiGet<ResponseBody>(apiPath: string, options?: ApiCallOptions): SyncTasks.Promise<ResponseBody> {
        return this
            .performApiGetDetailed<ResponseBody>(apiPath, options)
            .then(resp => resp.body);
    }

    performApiGetDetailed<TResponseBody>(apiPath: string, options?: ApiCallOptions)
            : SyncTasks.Promise<WebResponse<TResponseBody, ApiCallOptions>> {
        return this._performApiCall<TResponseBody>(apiPath, 'GET', undefined, options);
    }

    performApiPost<ResponseBody>(apiPath: string, objToPost: any, options?: ApiCallOptions): SyncTasks.Promise<ResponseBody> {
        return this
            .performApiPostDetailed<ResponseBody>(apiPath, objToPost, options)
            .then(resp => resp.body);
    }

    performApiPostDetailed<ResponseBody>(apiPath: string, objToPost: any, options?: ApiCallOptions)
            : SyncTasks.Promise<WebResponse<ResponseBody, ApiCallOptions>> {
        return this._performApiCall<ResponseBody>(apiPath, 'POST', objToPost, options);
    }

    performApiPatch<ResponseBody>(apiPath: string, objToPatch: any, options?: ApiCallOptions): SyncTasks.Promise<ResponseBody> {
        return this
            .performApiPatchDetailed<ResponseBody>(apiPath, objToPatch, options)
            .then(resp => resp.body);
    }

    performApiPatchDetailed<ResponseBody>(apiPath: string, objToPatch: any, options?: ApiCallOptions)
            : SyncTasks.Promise<WebResponse<ResponseBody, ApiCallOptions>> {
        return this._performApiCall<ResponseBody>(apiPath, 'PATCH', objToPatch, options);
    }

    performApiPut<ResponseBody>(apiPath: string, objToPut: any, options?: ApiCallOptions): SyncTasks.Promise<ResponseBody> {
        return this
            .performApiPutDetailed<ResponseBody>(apiPath, objToPut, options)
            .then(resp => resp.body);
    }

    performApiPutDetailed<ResponseBody>(apiPath: string, objToPut: any, options?: ApiCallOptions)
            : SyncTasks.Promise<WebResponse<ResponseBody, ApiCallOptions>> {
        return this._performApiCall<ResponseBody>(apiPath, 'PUT', objToPut, options);
    }

    performApiDelete<ResponseBody>(apiPath: string, objToDelete?: any, options?: ApiCallOptions): SyncTasks.Promise<ResponseBody> {
        return this
            .performApiDeleteDetailed<ResponseBody>(apiPath, objToDelete, options)
            .then(resp => resp.body);
    }

    performApiDeleteDetailed<ResponseBody>(apiPath: string, objToDelete: any, options?: ApiCallOptions)
            : SyncTasks.Promise<WebResponse<ResponseBody, ApiCallOptions>> {
        return this._performApiCall<ResponseBody>(apiPath, 'DELETE', objToDelete, options);
    }
}
