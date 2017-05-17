/**
* SimpleWebRequest.ts
* Author: David de Regt
* Copyright: Microsoft 2016
*
* Simple client for issuing web requests.
*/

import assert = require('assert');
import SyncTasks = require('synctasks');
import _ = require('./lodashMini');

import { ExponentialTime } from './ExponentialTime';

export interface WebResponse<T> {
    url: string;
    method: string;
    statusCode: number;
    statusText: string;
    headers: { [header: string]: string };
    body: T;
}

export interface WebErrorResponse extends WebResponse<any> {
    canceled?: boolean;
    timedOut?: boolean;
}

export enum WebRequestPriority {
    DontCare = 0,
    Low = 1,
    Normal = 2,
    High = 3,
    Critical = 4
}

export const enum ErrorHandlingType {
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
    file: NativeBlobFileData | File;
}

export interface XMLHttpRequestProgressEvent extends Event {
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
    headers?: { [header: string]: string };

    onProgress?: (progressEvent: XMLHttpRequestProgressEvent) => void;

    customErrorHandler?: (webRequest: SimpleWebRequest<any>, errorResponse: WebErrorResponse) => ErrorHandlingType;
    augmentErrorResponse?: (resp: WebErrorResponse) => void;
}

function isJsonContentType(ct: string) {
    return ct && ct.indexOf('application/json') === 0;
}

function isFormContentType(ct: string) {
    return ct && ct.indexOf('application/x-www-form-urlencoded') === 0;
}

export let DefaultOptions: WebRequestOptions = {
    priority: WebRequestPriority.Normal
};

export interface SimpleWebRequestOptions {
    // Maximum executing requests allowed.  Other requests will be queued until free spots become available.
    MaxSimultaneousRequests: number;

    // Use this to shim calls to setTimeout/clearTimeout with any other service/local function you want.
    setTimeout: (callback: () => void, timeoutMs?: number) => number;
    clearTimeout: (id: number) => void;
}

export let SimpleWebRequestOptions: SimpleWebRequestOptions = {
    MaxSimultaneousRequests: 5,

    setTimeout: setTimeout.bind(null),
    clearTimeout: clearTimeout.bind(null)
};

export function DefaultErrorHandler(webRequest: SimpleWebRequest<any>, errResp: WebErrorResponse) {
    if (errResp.statusCode >= 400 && errResp.statusCode < 600) {
        // Fail 4xx/5xx requests immediately. These are permenent failures, and shouldn't have retry logic applied to them.
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

export class SimpleWebRequest<T> {
    // List of pending requests, sorted from most important to least important (numerically descending)
    private static requestQueue: SimpleWebRequest<any>[] = [];

    // List of executing (non-finished) requests -- only to keep track of number of requests to compare to the max
    private static executingList: SimpleWebRequest<any>[] = [];

    private static _onLoadErrorSupportStatus = FeatureSupportStatus.Unknown;
    private static _timeoutSupportStatus = FeatureSupportStatus.Unknown;

    private _xhr: XMLHttpRequest;
    private _requestTimeoutTimer: number;
    private _deferred: SyncTasks.Deferred<WebResponse<T>>;
    private _options: WebRequestOptions;

    private _aborted = false;
    private _timedOut = false;
    private _paused = false;

    // De-dupe result handling for two reasons so far:
    // 1. Various platforms have bugs where they double-resolves aborted xmlhttprequests
    // 2. Safari seems to have a bug where sometimes it double-resolves happily-completed xmlhttprequests
    private _finishHandled = false;

    private _retryTimer: number;
    private _retryExponentialTime = new ExponentialTime(1000, 300000);

    constructor(private _action: string, private _url: string, options: WebRequestOptions) {
        this._options = _.defaults(options, DefaultOptions);
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

        if (this._xhr) {
            // Abort the in-flight request
            this._xhr.abort();
        }
        this._respond();
    }

    start(): SyncTasks.Promise<WebResponse<T>> {
        if (this._deferred) {
            assert.ok(false, 'WebRequest already started');
            return SyncTasks.Rejected('WebRequest already started');
        }

        this._deferred = SyncTasks.Defer<WebResponse<T>>();
        this._deferred.onCancel(() => {
            // Abort the XHR -- this should chain through to the fail case on readystatechange
            this.abort();
        });

        this._enqueue();

        return this._deferred.promise();
    }

    setUrl(newUrl: string): void {
        this._url = newUrl;
    }

    setHeader(key: string, val: string): void {
        if (!this._options.headers) {
            this._options.headers = {};
        }

        if (val) {
            this._options.headers[key] = val;
        } else {
            delete this._options.headers[key];
        }
    }

    getRequestHeaders(): { [header: string]: string } {
        return _.clone(this._options.headers);
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
        _.remove(SimpleWebRequest.requestQueue, (item: any) => item === this);
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

    private _enqueue(): void {
        // Throw it on the queue
        const index = _.findIndex(SimpleWebRequest.requestQueue, (request: any) => request._options.priority < this._options.priority);
        if (index > -1) {
            SimpleWebRequest.requestQueue.splice(index, 0, this);
        } else {
            SimpleWebRequest.requestQueue.push(this);
        }

        // See if it's time to execute it
        SimpleWebRequest.checkQueueProcessing();
    }

    private static checkQueueProcessing() {
        while (this.requestQueue.length > 0 && this.executingList.length < SimpleWebRequestOptions.MaxSimultaneousRequests) {
            const req = this.requestQueue.shift();
            this.executingList.push(req);
            req._fire();
        }
    }

    // TSLint thinks that this function is unused.  Silly tslint.
    // tslint:disable-next-line
    private _fire(): void {
        this._xhr = new XMLHttpRequest();

        // xhr.open() can throw an exception for a CSP violation.
        const openError = _.attempt(() => {
            // Apparently you're supposed to open the connection before adding events to it.  If you don't, the node.js implementation
            // of XHR actually calls this.abort() at the start of open()...  Bad implementations, hooray.
            this._xhr.open(this._action, this._url, true);
        });

        if (openError) {
            this._respond(openError.toString());
            return;
        }

        if (this._options.timeout) {
            const timeoutSupported = SimpleWebRequest._timeoutSupportStatus;
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
                    SimpleWebRequest._timeoutSupportStatus = FeatureSupportStatus.Supported;
                    if (timeoutSupported !== FeatureSupportStatus.Supported) {
                    // When this request initially fired we didn't know about support, bail & let the fallback method handle this
                        return;
                    }
                    this._timedOut = true;
                    // Set aborted flag to match simple timer approach, which aborts the request and results in an _respond call
                    this._aborted = true;
                    this._respond();
                };
            }
        }

        const onLoadErrorSupported = SimpleWebRequest._onLoadErrorSupportStatus;

        // Use onreadystatechange if we don't know about onload support or it onload is not supported
        if (onLoadErrorSupported !== FeatureSupportStatus.Supported) {
            if (onLoadErrorSupported === FeatureSupportStatus.Unknown) {
                // Set global status to detecting, leave local state so we can set a timer on finish
                SimpleWebRequest._onLoadErrorSupportStatus = FeatureSupportStatus.Detecting;
            }
            this._xhr.onreadystatechange = (e) => {
                if (this._xhr.readyState !== 4) {
                    // Wait for it to finish
                    return;
                }

                // This is the first request completed (unknown status when fired, detecting now), use it for detection
                if (onLoadErrorSupported === FeatureSupportStatus.Unknown &&
                        SimpleWebRequest._onLoadErrorSupportStatus === FeatureSupportStatus.Detecting) {
                    // If onload hasn't fired within 10 seconds of completion, detect as not supported
                    SimpleWebRequestOptions.setTimeout(() => {
                        if (SimpleWebRequest._onLoadErrorSupportStatus !== FeatureSupportStatus.Supported) {
                            SimpleWebRequest._onLoadErrorSupportStatus = FeatureSupportStatus.NotSupported;
                        }
                    }, 10000);
                }

                this._respond();
            };
        }

        if (onLoadErrorSupported !== FeatureSupportStatus.NotSupported) {
            // onLoad and onError are part of the XMLHttpRequest Level 2 spec, should be supported in most modern browsers
            this._xhr.onload = () => {
                SimpleWebRequest._onLoadErrorSupportStatus = FeatureSupportStatus.Supported;
                if (onLoadErrorSupported !== FeatureSupportStatus.Supported) {
                    // When this request initially fired we didn't know about support, bail & let the fallback method handle this
                    return;
                }
                this._respond();
            };
            this._xhr.onerror = () => {
                SimpleWebRequest._onLoadErrorSupportStatus = FeatureSupportStatus.Supported;
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

            this._respond();
        };

        if (this._xhr.upload && this._options.onProgress) {
            this._xhr.upload.onprogress = this._options.onProgress as any as (ev: ProgressEvent) => void;
        }

        const acceptType = this._options.acceptType || 'json';
        this._xhr.responseType = acceptType === 'blob' ? 'arraybuffer' : 'json';
        this._xhr.setRequestHeader('Accept', SimpleWebRequest.mapContentType(acceptType));

        this._xhr.withCredentials = this._options.withCredentials;

        // check/process headers
        let headersCheck: _.Dictionary<boolean> = {};
        _.forEach(this._options.headers, (val: any, key: string ) => {
            const headerLower = key.toLowerCase();
            if (headerLower === 'content-type') {
                assert.ok(false, 'Don\'t set Content-Type with options.headers -- use it with the options.contentType property');
                return;
            }
            if (headerLower === 'accept') {
                assert.ok(false, 'Don\'t set Accept with options.headers -- use it with the options.acceptType property');
                return;
            }
            assert.ok(!headersCheck[headerLower], 'Setting duplicate header key: ' + headersCheck[headerLower] + ' and ' + key);

            if (!val) {
                assert.ok(false, 'Empty header being sent for key: ' + key + '. This will crash Android RN if let through.');
                return;
            }

            headersCheck[headerLower] = true;
            this._xhr.setRequestHeader(key, val);
        });

        if (this._options.sendData) {
            const contentType = SimpleWebRequest.mapContentType(this._options.contentType || 'json');
            this._xhr.setRequestHeader('Content-Type', contentType);

            const sendData = SimpleWebRequest.mapBody(this._options.sendData, contentType);

            this._xhr.send(sendData);
        } else {
            this._xhr.send();
        }
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
                const params = _.map(sendData as _.Dictionary<any>, (val: any , key: string) =>
                    encodeURIComponent(key) + (val ? '=' + encodeURIComponent(val.toString()) : ''));
                body = params.join('&');
            }
        }

        return body;
    }

    private _getResponseInfo(statusCode: number): WebResponse<T> {
        if (!this._xhr) {
            return {
                url: this._url,
                method: this._action,
                statusCode: 0,
                statusText: 'Browser Error - Possible CORS or Connectivity Issue',
                headers: {},
                body: undefined
            };
        }

        // Parse out headers
        let headers: { [header: string]: string } = {};
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

        let body = this._xhr.response;
        if (headers['content-type'] && isJsonContentType(headers['content-type'])) {
            if (!body || !_.isObject(body)) {
                // Looks like responseType didn't parse it for us -- try shimming it in from responseText
                try {
                    // Even accessing responseText may throw
                    if (this._xhr.responseText) {
                        body = JSON.parse(this._xhr.responseText);
                    }
                } catch (e) {
                    // Catch it so we don't explode, but the client won't get any object out the other side, so they'll probably explode
                    // there instead anyway.
                }
            }
        }

        return {
            url: this._url,
            method: this._action,
            statusCode: statusCode,
            statusText: this._xhr.statusText,
            headers: headers,
            body: body
        };
    }

    private _respond(errorStatusText?: string) {
        if (this._finishHandled) {
            // Aborted web requests often double-finish due to odd browser behavior, but non-aborted requests shouldn't...
            // Unfortunately, this assertion fires frequently in the Safari browser, presumably due to a non-standard
            // XHR implementation, so we need to comment it out.
            // This also might get hit during browser feature detection process
            //assert.ok(this._aborted || this._timedOut, 'Double-finished XMLHttpRequest');
            return;
        }

        this._finishHandled = true;

        // Pull it out of whichever queue it's sitting in
        if (this._xhr) {
            _.pull(SimpleWebRequest.executingList, this);
        } else {
            _.pull(SimpleWebRequest.requestQueue, this);
        }

        if (this._retryTimer) {
            SimpleWebRequestOptions.clearTimeout(this._retryTimer);
            this._retryTimer = undefined;
        }

        if (this._requestTimeoutTimer) {
            SimpleWebRequestOptions.clearTimeout(this._requestTimeoutTimer);
            this._requestTimeoutTimer = undefined;
        }

        let statusCode = 0;
        let statusText: string;
        if (this._xhr) {
            try {
                statusCode = this._xhr.status;
                statusText = this._xhr.statusText || errorStatusText;
            } catch (e) {
                // Some browsers error when you try to read status off aborted requests
            }
        }

        const resp = this._getResponseInfo(statusCode);

        if ((statusCode >= 200 && statusCode < 300) || statusCode === 304) {
            // Happy path!
            this._deferred.resolve(resp);
        } else {
            let errResp = resp as WebErrorResponse;
            errResp.canceled = this._aborted;
            errResp.timedOut = this._timedOut;
            errResp.statusText = statusText;

            if (this._options.augmentErrorResponse) {
                this._options.augmentErrorResponse(errResp);
            }

            if (errResp.canceled || errResp.statusCode === 0) {
                // Fail aborted requests and statusCode zero (bad connectivity/CORS) responses immediately, bypassing any
                // customErrorHandler, since there's no info to work off, these are always permanent failures.
                this._deferred.reject(errResp);
            } else {
                // Policy-adaptable failure
                const handleResponse = (this._options.customErrorHandler || DefaultErrorHandler)(this, errResp);

                const retry = handleResponse !== ErrorHandlingType.DoNotRetry && (
                    this._options.retries > 0 ||
                    handleResponse === ErrorHandlingType.PauseUntilResumed ||
                    handleResponse === ErrorHandlingType.RetryUncountedImmediately ||
                    handleResponse === ErrorHandlingType.RetryUncountedWithBackoff);

                if (retry) {
                    if (handleResponse === ErrorHandlingType.RetryCountedWithBackoff) {
                        this._options.retries--;
                    }

                    if (this._requestTimeoutTimer) {
                        SimpleWebRequestOptions.clearTimeout(this._requestTimeoutTimer);
                        this._requestTimeoutTimer = undefined;
                    }

                    this._finishHandled = false;

                    // Clear the XHR since we technically just haven't started again yet...
                    this._xhr = undefined;

                    if (handleResponse === ErrorHandlingType.PauseUntilResumed) {
                        this._paused = true;
                    } else if (handleResponse === ErrorHandlingType.RetryUncountedImmediately) {
                        this._enqueue();
                    } else {
                        this._retryTimer = SimpleWebRequestOptions.setTimeout(() => {
                            this._retryTimer = undefined;
                            this._enqueue();
                        }, this._retryExponentialTime.getTimeAndCalculateNext()) as any as number;
                    }
                } else {
                    // No more retries -- fail.
                    this._deferred.reject(errResp);
                }
            }
        }

        // Freed up a spot, so let's see if there's other stuff pending
        SimpleWebRequest.checkQueueProcessing();
    }
}
