# SimpleRestClients

A simple set of wrappers for RESTful calls.  Consists of two modules:

## SimpleWebRequest

Wraps a single web request.  Has lots of overrides for priorization, delays, retry logic, error handling, etc.

## GenericRestClient

Wraps SimpleWebRequest for usage across a single RESTful service.  In our codebase, we have several specific RESTful service interaction
classes that each implement GenericRestClient so that all of the requests get the same error handling, authentication, header-setting,
etc.
