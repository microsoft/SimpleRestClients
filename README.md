# SimpleRestClients

A simple set of wrappers for RESTful calls.  Consists of two modules:

## SimpleWebRequest

Wraps a single web request.  Has lots of overrides for priorization, delays, retry logic, error handling, etc.

## GenericRestClient

Wraps SimpleWebRequest for usage across a single RESTful service.  In our codebase, we have several specific RESTful service interaction
classes that each implement GenericRestClient so that all of the requests get the same error handling, authentication, header-setting,
etc.

## GenericRestClient Sample Usage

```
import { GenericRestClient, ApiCallOptions }  from 'simplerestclients';
import SyncTasks = require('synctasks');

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
    protected _getHeaders(options: ApiCallOptions): { [key: string]: string } {
        let headers = super._getHeaders(options);
        headers['X-AppId'] = this._appId;
        return headers;
    }

    // Define public methods that expose the APIs provided through
    // the REST service.
    getAllUsers(): SyncTasks.Promise<User[]> {
        return this.performApiGet<User[]>('users');
    }

    getUserById(id: string): SyncTasks.Promise<User> {
        return this.performApiGet<User>('user/' + id);
    }

    setUser(user: User): SyncTasks.Promise<void> {
        return this.performApiPut<void>('user/' + user.id, user);
    }
}
```
