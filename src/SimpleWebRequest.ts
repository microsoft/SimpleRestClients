/**
 * SimpleWebRequest.ts
 * Author: David de Regt
 * Copyright: Microsoft 2016
 *
 * Simple client for issuing web requests.
 */

import * as _ from 'lodash';
import * as assert from 'assert';
import * as SyncTasks from 'synctasks';

import { ExponentialTime } from './ExponentialTime';

export interface Headers {
    [header: string]: string;
}

export interface WebTransportResponseBase {
    url: string;
    method: string;
    statusCode: number;
    statusText: string|undefined;
    headers: Headers;
}

export interface WebTransportResponse<TBody> extends WebTransportResponseBase {
    body: TBody;
}

export interface WebTransportErrorResponse extends WebTransportResponseBase {
    body: any;
    canceled: boolean;
    timedOut: boolean;
}

export interface RestRequestInResponse<TOptions = WebRequestOptions> {
    requestOptions: TOptions;
    requestHeaders: Headers;
}

export interface WebResponseBase<TOptions = WebRequestOptions>
    extends WebTransportResponseBase, RestRequestInResponse<TOptions> {}

export interface WebErrorResponse<TOptions = WebRequestOptions>
    extends WebTransportErrorResponse, RestRequestInResponse<TOptions> {}

export interface WebResponse<TBody, TOptions = WebRequestOptions>
    extends WebTransportResponse<TBody>, RestRequestInResponse<TOptions> {}

export enum WebRequestPriority {
    DontCare = 0,
    Low = 1,
    Normal = 2,
    High = 3,
    Critical = 4
}

export enum ErrorHandlingType {
    // Ignore retry policy, if any, and fail immediately
    DoNotRetry,

    // Retry immediately, without counting it as a failure (used when you've made some sort of change to the )
    RetryUncountedImmediately,

    // Retry with exponential backoff, but don't count it as a failure (for 429 handling)
    RetryUncountedWithBackoff,

    // Use standard retry policy (count it as a failure, exponential backoff as policy dictates)
    RetryCountedWithBackoff,

    // Return this if you need to satisfy some condition before this request will retry (then call .resumeRetrying()).
    PauseUntilResumed
}

export interface NativeBlobFileData {
    uri: string;
    size: number;
    name: string;
    type: string;
}

export interface NativeFileData {
    file: NativeBlobFileData|File;
}

export interface XMLHttpRequestProgressEvent extends ProgressEvent {
    lengthComputable: boolean;
    loaded: number;
    path: string[];
    percent: number;
    position: number;
    total: number;
    totalSize: number;
}

export type SendDataType = Object | string | NativeFileData;

export interface WebRequestOptions {
    withCredentials?: boolean;
    retries?: number;
    priority?: WebRequestPriority;
    timeout?: number;
    acceptType?: string;
    contentType?: string;
    sendData?: SendDataType;
    /* Deprecated: use overrideGetHeaders */ headers?: Headers;

    // Used instead of calling getHeaders.
    overrideGetHeaders?: Headers;
    // Overrides all other headers.
    augmentHeaders?: Headers;

    streamingDownloadProgress?: (responseText: string) => void;

    onProgress?: (progressEvent: XMLHttpRequestProgressEvent) => void;

    customErrorHandler?: (webRequest: SimpleWebRequestBase, errorResponse: WebErrorResponse) => ErrorHandlingType;
    augmentErrorResponse?: (resp: WebErrorResponse) => void;
}

function isJsonContentType(ct: string) {
    return ct && ct.indexOf('application/json') === 0;
}

function isFormContentType(ct: string) {
    return ct && ct.indexOf('application/x-www-form-urlencoded') === 0;
}

function isFormDataContentType(ct: string) {
    return ct && ct.indexOf('multipart/form-data') === 0;
}

export const DefaultOptions: WebRequestOptions = {
    priority: WebRequestPriority.Normal
};

export interface ISimpleWebRequestOptions {
    // Maximum executing requests allowed.  Other requests will be queued until free spots become available.
    MaxSimultaneousRequests: number;

    // Use this to shim calls to setTimeout/clearTimeout with any other service/local function you want.
    setTimeout: (callback: () => void, timeoutMs?: number) => number;
    clearTimeout: (id: number) => void;
}

export let SimpleWebRequestOptions: ISimpleWebRequestOptions = {
    MaxSimultaneousRequests: 5,

    setTimeout: (callback: () => void, timeoutMs?: number) => window.setTimeout(callback, timeoutMs),
    clearTimeout: (id: number) => window.clearTimeout(id)
};

export function DefaultErrorHandler(webRequest: SimpleWebRequestBase, errResp: WebTransportErrorResponse) {
    if (errResp.canceled || !errResp.statusCode || errResp.statusCode >= 400 && errResp.statusCode < 600) {
        // Fail canceled/0/4xx/5xx requests immediately.
        // These are permenent failures, and shouldn't have retry logic applied to them.
        return ErrorHandlingType.DoNotRetry;
    }

    // Possible transient failure -- just retry as normal with backoff.
    return ErrorHandlingType.RetryCountedWithBackoff;
}

// Note: The ordering of this enum is used for detection logic
const enum FeatureSupportStatus {
    Unknown,
    Detecting,
    NotSupported,
    Supported
}

// List of pending requests, sorted from most important to least important (numerically descending)
let requestQueue: SimpleWebRequestBase[] = [];

// List of executing (non-finished) requests -- only to keep track of number of requests to compare to the max
let executingList: SimpleWebRequestBase[] = [];

// Feature flag checkers for whether the current environment supports various types of XMLHttpRequest features
let onLoadErrorSupportStatus = FeatureSupportStatus.Unknown;
let timeoutSupportStatus = FeatureSupportStatus.Unknown;

export abstract class SimpleWebRequestBase<TOptions extends WebRequestOptions = WebRequestOptions> {
    protected _xhr: XMLHttpRequest|undefined;
    protected _xhrRequestHeaders: Headers|undefined;
    protected _requestTimeoutTimer: number|undefined;
    protected _options: TOptions;

    protected _aborted = false;
    protected _timedOut = false;
    protected _paused = false;
    protected _created = Date.now();

    // De-dupe result handling for two reasons so far:
    // 1. Various platforms have bugs where they double-resolves aborted xmlhttprequests
    // 2. Safari seems to have a bug where sometimes it double-resolves happily-completed xmlhttprequests
    protected _finishHandled = false;

    protected _retryTimer: number|undefined;
    protected _retryExponentialTime = new ExponentialTime(1000, 300000);

    constructor(protected _action: string,
            protected _url: string, options: TOptions,
            protected _getHeaders?: () => Headers,
            protected _blockRequestUntil?: () => SyncTasks.Promise<void>|undefined) {
        this._options = _.defaults(options, DefaultOptions);
    }

    getPriority(): WebRequestPriority {
        return this._options.priority || WebRequestPriority.DontCare;
    }

    abstract abort(): void;

    protected static checkQueueProcessing() {
        while (requestQueue.length > 0 && executingList.length < SimpleWebRequestOptions.MaxSimultaneousRequests) {
            const req = requestQueue.shift()!!!;
            const blockPromise = (req._blockRequestUntil&& req._blockRequestUntil()) || SyncTasks.Resolved();
            blockPromise.then(() => {
                if (executingList.length < SimpleWebRequestOptions.MaxSimultaneousRequests) {
                    executingList.push(req);
                    req._fire();
                } else {
                    req._enqueue();
                }
            }, err => {
                // fail the request if the block promise is rejected
                req._respond('Error in _blockRequestUntil: ' + err.toString());
            });
        }
    }

    protected _removeFromQueue(): void {
        // Pull it out of whichever queue it's sitting in
        if (this._xhr) {
            _.pull(executingList, this);
        } else {
            _.pull(requestQueue, this);
        }
    }

    protected _assertAndClean(expression: any, message: string): void {
        if (!expression) {
            this._removeFromQueue();
            console.error(message);
            assert.ok(expression, message);
        }
    }

    // TSLint thinks that this function is unused.  Silly tslint.
    // tslint:disable-next-line
    private _fire(): void {
        this._xhr = new XMLHttpRequest();
        this._xhrRequestHeaders = {};

        // xhr.open() can throw an exception for a CSP violation.
        const openError = _.attempt(() => {
            // Apparently you're supposed to open the connection before adding events to it.  If you don't, the node.js implementation
            // of XHR actually calls this.abort() at the start of open()...  Bad implementations, hooray.
            this._xhr!!!.open(this._action, this._url, true);
        });

        if (openError) {
            this._respond(openError.toString());
            return;
        }

        if (this._options.timeout) {
            const timeoutSupported = timeoutSupportStatus;
             // Use manual timer if we don't know about timeout support
            if (timeoutSupported !== FeatureSupportStatus.Supported) {
                assert.ok(!this._requestTimeoutTimer, 'Double-fired requestTimeoutTimer');
                this._requestTimeoutTimer = SimpleWebRequestOptions.setTimeout(() => {
                    this._requestTimeoutTimer = undefined;

                    this._timedOut = true;
                    this.abort();
                }, this._options.timeout);
            }

            // This is our first completed request. Use it for feature detection
            if (timeoutSupported === FeatureSupportStatus.Supported || timeoutSupported <= FeatureSupportStatus.Detecting) {
                // timeout and ontimeout are part of the XMLHttpRequest Level 2 spec, should be supported in most modern browsers
                this._xhr.timeout = this._options.timeout;
                this._xhr.ontimeout = () => {
                    timeoutSupportStatus = FeatureSupportStatus.Supported;
                    if (timeoutSupported !== FeatureSupportStatus.Supported) {
                    // When this request initially fired we didn't know about support, bail & let the fallback method handle this
                        return;
                    }
                    this._timedOut = true;
                    // Set aborted flag to match simple timer approach, which aborts the request and results in an _respond call
                    this._aborted = true;
                    this._respond('Aborted');
                };
            }
        }

        const onLoadErrorSupported = onLoadErrorSupportStatus;

        // Use onreadystatechange if we don't know about onload support or it onload is not supported
        if (onLoadErrorSupported !== FeatureSupportStatus.Supported) {
            if (onLoadErrorSupported === FeatureSupportStatus.Unknown) {
                // Set global status to detecting, leave local state so we can set a timer on finish
                onLoadErrorSupportStatus = FeatureSupportStatus.Detecting;
            }
            this._xhr.onreadystatechange = (e) => {
                if (this._xhr!!!.readyState === 3 && this._options.streamingDownloadProgress) {
                    this._options.streamingDownloadProgress(this._xhr!!!.responseText);
                }

                if (this._xhr!!!.readyState !== 4) {
                    // Wait for it to finish
                    return;
                }

                // This is the first request completed (unknown status when fired, detecting now), use it for detection
                if (onLoadErrorSupported === FeatureSupportStatus.Unknown &&
                        onLoadErrorSupportStatus === FeatureSupportStatus.Detecting) {
                    // If onload hasn't fired within 10 seconds of completion, detect as not supported
                    SimpleWebRequestOptions.setTimeout(() => {
                        if (onLoadErrorSupportStatus !== FeatureSupportStatus.Supported) {
                            onLoadErrorSupportStatus = FeatureSupportStatus.NotSupported;
                        }
                    }, 10000);
                }

                this._respond();
            };
        }

        if (onLoadErrorSupported !== FeatureSupportStatus.NotSupported) {
            // onLoad and onError are part of the XMLHttpRequest Level 2 spec, should be supported in most modern browsers
            this._xhr.onload = () => {
                onLoadErrorSupportStatus = FeatureSupportStatus.Supported;
                if (onLoadErrorSupported !== FeatureSupportStatus.Supported) {
                    // When this request initially fired we didn't know about support, bail & let the fallback method handle this
                    return;
                }
                this._respond();
            };
            this._xhr.onerror = () => {
                onLoadErrorSupportStatus = FeatureSupportStatus.Supported;
                if (onLoadErrorSupported !== FeatureSupportStatus.Supported) {
                    // When this request initially fired we didn't know about support, bail & let the fallback method handle this
                    return;
                }
                this._respond();
            };
        }

        this._xhr.onabort = (e) => {
            // If the browser cancels us (page navigation or whatever), it sometimes calls both the readystatechange and this,
            // so make sure we know that this is an abort.
            this._aborted = true;

            this._respond('Aborted');
        };

        if (this._xhr.upload && this._options.onProgress) {
            this._xhr.upload.onprogress = this._options.onProgress as any as (ev: ProgressEvent) => void;
        }

        const acceptType = this._options.acceptType || 'json';
        this._xhr.responseType = SimpleWebRequestBase._getResponseType(acceptType);
        this._setRequestHeader('Accept', SimpleWebRequestBase.mapContentType(acceptType));

        this._xhr.withCredentials = !!this._options.withCredentials;

        const nextHeaders = this.getRequestHeaders();
        // check/process headers
        let headersCheck: _.Dictionary<boolean> = {};
        _.forEach(nextHeaders, (val, key) => {
            const headerLower = key.toLowerCase();
            if (headerLower === 'content-type') {
                this._assertAndClean(false, 'Don\'t set Content-Type with options.headers -- use it with the options.contentType property');
                return;
            }
            if (headerLower === 'accept') {
                this._assertAndClean(false, 'Don\'t set Accept with options.headers -- use it with the options.acceptType property');
                return;
            }
            assert.ok(!headersCheck[headerLower], 'Setting duplicate header key: ' + headersCheck[headerLower] + ' and ' + key);

            if (val === undefined || val === null) {
                console.warn('Tried to set header "' + key + '" on request with "' + val + '" value, header will be dropped');
                return;
            }

            headersCheck[headerLower] = true;
            this._setRequestHeader(key, val);
        });

        if (this._options.sendData) {
            const contentType = SimpleWebRequestBase.mapContentType(this._options.contentType || 'json');
            this._setRequestHeader('Content-Type', contentType);

            const sendData = SimpleWebRequestBase.mapBody(this._options.sendData, contentType);

            this._xhr.send(sendData as BodyInit);
        } else {
            this._xhr.send();
        }
    }

    private _setRequestHeader(key: string, val: string): void {
        this._xhr!!!.setRequestHeader(key, val);
        this._xhrRequestHeaders!!![key] = val;
    }

    static mapContentType(contentType: string): string {
        if (contentType === 'json') {
            return 'application/json';
        } else if (contentType === 'form') {
            return 'application/x-www-form-urlencoded';
        } else {
            return contentType;
        }
    }

    static mapBody(sendData: SendDataType, contentType: string): SendDataType {
        let body = sendData;
        if (isJsonContentType(contentType)) {
            if (!_.isString(sendData)) {
                body = JSON.stringify(sendData);
            }
        } else if (isFormContentType(contentType)) {
            if (!_.isString(sendData) && _.isObject(sendData)) {
                const params = _.map(sendData as _.Dictionary<any>, (val, key) =>
                    encodeURIComponent(key) + (val ? '=' + encodeURIComponent(val.toString()) : ''));
                body = params.join('&');
            }
        } else if (isFormDataContentType(contentType)) {
            if (_.isObject(sendData)) {
                // Note: This only works for IE10 and above.
                body = new FormData();
                _.forEach(sendData as _.Dictionary<any>, (val, key) => {
                    (body as FormData).append(key, val);
                });
            } else {
                assert.ok(false, 'contentType multipart/form-data must include an object as sendData');
            }
        }

        return body;
    }

    setUrl(newUrl: string): void {
        this._url = newUrl;
    }

    setHeader(key: string, val: string|undefined): void {
        if (!this._options.augmentHeaders) {
            this._options.augmentHeaders = {};
        }

        if (val) {
            this._options.augmentHeaders[key] = val;
        } else {
            delete this._options.augmentHeaders[key];
        }
    }

    getRequestHeaders(): Headers {
        let headers: Headers = {};

        if (this._getHeaders && !this._options.overrideGetHeaders && !this._options.headers) {
            headers = _.extend(headers, this._getHeaders());
        }

        if (this._options.overrideGetHeaders) {
            headers = _.extend(headers, this._options.overrideGetHeaders);
        }

        if (this._options.headers) {
            headers = _.extend(headers, this._options.headers);
        }

        if (this._options.augmentHeaders) {
            headers = _.extend(headers, this._options.augmentHeaders);
        }

        return headers;
    }

    getOptions(): Readonly<WebRequestOptions> {
        return _.cloneDeep(this._options);
    }

    setPriority(newPriority: WebRequestPriority): void {
        if (this._options.priority === newPriority) {
            return;
        }

        this._options.priority = newPriority;

        if (this._paused) {
            return;
        }

        if (this._xhr) {
            // Already fired -- wait for it to retry for the new priority to matter
            return;
        }

        // Remove and re-queue
        _.remove(requestQueue, item => item === this);
        this._enqueue();
    }

    resumeRetrying(): void {
        if (!this._paused) {
            assert.ok(false, 'resumeRetrying() called but not paused!');
            return;
        }

        this._paused = false;
        this._enqueue();
    }

    protected _enqueue(): void {
        // It's possible for a request to be canceled before it's queued since onCancel fires synchronously and we set up the listener
        // before queueing for execution
        // An aborted request should never be queued for execution
        if (this._aborted) {
            return;
        }

        // Throw it on the queue
        const index = _.findIndex(requestQueue, request =>
            // find a request with the same priority, but newer
            (request.getPriority() === this.getPriority() && request._created > this._created) ||
            // or a request with lower priority
            (request.getPriority() < this.getPriority()));

        if (index > -1) {
            //add me before the found request
            requestQueue.splice(index, 0, this);
        } else {
            //add me at the end
            requestQueue.push(this);
        }

        // See if it's time to execute it
        SimpleWebRequestBase.checkQueueProcessing();
    }

    private static _getResponseType(acceptType: string): XMLHttpRequestResponseType {
        if (acceptType === 'blob') {
            return 'arraybuffer';
        }

        if (acceptType === 'text/xml' || acceptType === 'application/xml') {
            return 'document';
        }

        if (acceptType === 'text/plain') {
            return 'text';
        }

        return 'json';
    }

    protected abstract _respond(errorStatusText?: string): void;
}

export class SimpleWebRequest<TBody, TOptions extends WebRequestOptions = WebRequestOptions> extends SimpleWebRequestBase<TOptions> {

    private _deferred: SyncTasks.Deferred<WebResponse<TBody, TOptions>>;

    constructor(action: string, url: string, options: TOptions, getHeaders?: () => Headers,
            blockRequestUntil?: () => SyncTasks.Promise<void>|undefined) {
        super(action, url, options, getHeaders, blockRequestUntil);
    }

    abort(): void {
        if (this._aborted) {
            assert.ok(false, 'Already aborted ' + this._action + ' request to ' + this._url);
            return;
        }

        this._aborted = true;

        if (this._retryTimer) {
            SimpleWebRequestOptions.clearTimeout(this._retryTimer);
            this._retryTimer = undefined;
        }

        if (this._requestTimeoutTimer) {
            SimpleWebRequestOptions.clearTimeout(this._requestTimeoutTimer);
            this._requestTimeoutTimer = undefined;
        }

        if (!this._deferred) {
            assert.ok(false, 'Haven\'t even fired start() yet -- can\'t abort');
            return;
        }

        // Cannot rely on this._xhr.abort() to trigger this._xhr.onAbort() synchronously, thus we must trigger an early response here
        this._respond('Aborted');

        if (this._xhr) {
            // Abort the in-flight request
            this._xhr.abort();
        }
    }

    start(): SyncTasks.Promise<WebResponse<TBody, TOptions>> {
        if (this._deferred) {
            assert.ok(false, 'WebRequest already started');
            return SyncTasks.Rejected('WebRequest already started');
        }

        this._deferred = SyncTasks.Defer<WebResponse<TBody, TOptions>>();
        this._deferred.onCancel(() => {
            // Abort the XHR -- this should chain through to the fail case on readystatechange
            this.abort();
        });

        this._enqueue();

        return this._deferred.promise();
    }

    protected _respond(errorStatusText?: string) {
        if (this._finishHandled) {
            // Aborted web requests often double-finish due to odd browser behavior, but non-aborted requests shouldn't...
            // Unfortunately, this assertion fires frequently in the Safari browser, presumably due to a non-standard
            // XHR implementation, so we need to comment it out.
            // This also might get hit during browser feature detection process
            //assert.ok(this._aborted || this._timedOut, 'Double-finished XMLHttpRequest');
            return;
        }

        this._finishHandled = true;

        this._removeFromQueue();

        if (this._retryTimer) {
            SimpleWebRequestOptions.clearTimeout(this._retryTimer);
            this._retryTimer = undefined;
        }

        if (this._requestTimeoutTimer) {
            SimpleWebRequestOptions.clearTimeout(this._requestTimeoutTimer);
            this._requestTimeoutTimer = undefined;
        }

        let statusCode = 0;
        let statusText: string|undefined;
        if (this._xhr) {
            try {
                statusCode = this._xhr.status;
                statusText = this._xhr.statusText || errorStatusText;
            } catch (e) {
                // Some browsers error when you try to read status off aborted requests
            }
        } else {
            statusText = errorStatusText || 'Browser Error - Possible CORS or Connectivity Issue';
        }

        let headers: Headers = {};
        let body: any;

        // Build the response info
        if (this._xhr) {
            // Parse out headers
            const headerLines = (this._xhr.getAllResponseHeaders() || '').split(/\r?\n/);
            headerLines.forEach(line => {
                if (line.length === 0) {
                    return;
                }

                const index = line.indexOf(':');
                if (index === -1) {
                    headers[line] = '';
                } else {
                    headers[line.substr(0, index).toLowerCase()] = line.substr(index + 1).trim();
                }
            });

            // Some browsers apparently don't set the content-type header in some error conditions from getAllResponseHeaders but do return
            // it from the normal getResponseHeader.  No clue why, but superagent mentions it as well so it's best to just conform.
            if (!headers['content-type']) {
                const check = this._xhr.getResponseHeader('content-type');
                if (check) {
                    headers['content-type'] = check;
                }
            }

            body = this._xhr.response;
            if (headers['content-type'] && isJsonContentType(headers['content-type'])) {
                if (!body || !_.isObject(body)) {
                    // Response can be null if the responseType does not match what the server actually sends
                    // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
                    
                    // Only access responseText if responseType is "text" or "", otherwise it will throw
                    // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseText
                    if ((this._xhr.responseType === 'text' || this._xhr.responseType === '') && this._xhr.responseText) {
                        body = JSON.parse(this._xhr.responseText);
                    }
                }
            }
        }

        if (this._xhr && this._xhr.readyState === 4 && ((statusCode >= 200 && statusCode < 300) || statusCode === 304)) {
            // Happy path!
            const resp: WebResponse<TBody, TOptions> = {
                url: this._xhr.responseURL || this._url,
                method: this._action,
                requestOptions: this._options,
                requestHeaders: this._xhrRequestHeaders || {},
                statusCode: statusCode,
                statusText: statusText,
                headers: headers,
                body: body as TBody,
            };

            this._deferred.resolve(resp);
        } else {
            let errResp: WebErrorResponse<TOptions> = {
                url: (this._xhr ? this._xhr.responseURL : undefined) || this._url,
                method: this._action,
                requestOptions: this._options,
                requestHeaders: this._xhrRequestHeaders || {},
                statusCode: statusCode,
                statusText: statusText,
                headers: headers,
                body: body,
                canceled: this._aborted,
                timedOut: this._timedOut,
            };

            if (this._options.augmentErrorResponse) {
                this._options.augmentErrorResponse(errResp);
            }

            // Policy-adaptable failure
            const handleResponse = this._options.customErrorHandler
                ? this._options.customErrorHandler(this, errResp)
                : DefaultErrorHandler(this, errResp);

            const retry = handleResponse !== ErrorHandlingType.DoNotRetry && (
                (this._options.retries && this._options.retries > 0) ||
                handleResponse === ErrorHandlingType.PauseUntilResumed ||
                handleResponse === ErrorHandlingType.RetryUncountedImmediately ||
                handleResponse === ErrorHandlingType.RetryUncountedWithBackoff);

            if (retry) {
                if (handleResponse === ErrorHandlingType.RetryCountedWithBackoff) {
                    this._options.retries!!!--;
                }

                if (this._requestTimeoutTimer) {
                    SimpleWebRequestOptions.clearTimeout(this._requestTimeoutTimer);
                    this._requestTimeoutTimer = undefined;
                }

                this._aborted = false;
                this._finishHandled = false;

                // Clear the XHR since we technically just haven't started again yet...
                if (this._xhr) {
                    this._xhr.onabort = null!!!;
                    this._xhr.onerror = null!!!;
                    this._xhr.onload = null!!!;
                    this._xhr.onprogress = null!!!;
                    this._xhr.onreadystatechange = null!!!;
                    this._xhr.ontimeout = null!!!;
                    this._xhr = undefined;

                    this._xhrRequestHeaders = undefined;
                }

                if (handleResponse === ErrorHandlingType.PauseUntilResumed) {
                    this._paused = true;
                } else if (handleResponse === ErrorHandlingType.RetryUncountedImmediately) {
                    this._enqueue();
                } else {
                    this._retryTimer = SimpleWebRequestOptions.setTimeout(() => {
                        this._retryTimer = undefined;
                        this._enqueue();
                    }, this._retryExponentialTime.getTimeAndCalculateNext());
                }
            } else {
                // No more retries -- fail.
                this._deferred.reject(errResp);
            }
        }

        // Freed up a spot, so let's see if there's other stuff pending
        SimpleWebRequestBase.checkQueueProcessing();
    }
}
