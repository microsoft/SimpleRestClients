# SimpleRestClients

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/Microsoft/SimpleRestClients/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/simplerestclients.svg?style=flat-square)](https://www.npmjs.com/package/simplerestclients) [![npm downloads](https://img.shields.io/npm/dm/simplerestclients.svg?style=flat-square)](https://www.npmjs.com/package/simplerestclients) [![Build Status](https://img.shields.io/travis/Microsoft/SimpleRestClients/master.svg?style=flat-square)](https://travis-ci.org/Microsoft/SimpleRestClients) [![David](https://img.shields.io/david/Microsoft/SimpleRestClients.svg?style=flat-square)](https://github.com/Microsoft/SimpleRestClients) ![npm bundle size (minified)](https://img.shields.io/bundlephobia/min/simplerestclients.svg?style=flat-square) ![npm bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/simplerestclients.svg?style=flat-square)

> A simple set of wrappers for RESTful calls.

## Installation

```shell
npm install --save simplerestclients
```

## SimpleRestClients consists of two modules:

### `SimpleWebRequest`

Wraps a single web request.  Has lots of overrides for priorization, delays, retry logic, error handling, etc.

### `GenericRestClient`

Wraps SimpleWebRequest for usage across a single RESTful service.  In our codebase, we have several specific RESTful service interaction
classes that each implement GenericRestClient so that all of the requests get the same error handling, authentication, header-setting,
etc.

## GenericRestClient Sample Usage

```typescript
import * as SyncTasks from 'synctasks';
import { GenericRestClient, ApiCallOptions, Headers } from 'simplerestclients';

interface User {
    id: string;
    firstName: string;
    lastName: string;
}

class MyRestClient extends GenericRestClient {
    constructor(private _appId: string) {
        super('https://myhost.com/api/v1/');
    }

    // Override _getHeaders to append a custom header with the app ID.
    protected _getHeaders(options: ApiCallOptions): Headers {
        return { ...super._getHeaders(options), 'X-AppId': this._appId };
    }

    // Define public methods that expose the APIs provided through the REST service.
    getAllUsers(): SyncTasks.Promise<User[]> {
        return this.performApiGet<User[]>('users');
    }

    getUserById(id: string): SyncTasks.Promise<User> {
        return this.performApiGet<User>(`user/${ id }`);
    }

    setUser(user: User): SyncTasks.Promise<void> {
        return this.performApiPut<void>(`user/${ user.id }`, user);
    }
}
```
