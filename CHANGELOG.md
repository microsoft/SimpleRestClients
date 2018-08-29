# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

## [0.2.0] - 2018-08-29
### Added
- Unit tests verifying queueing/blocking requests and executing them in order

### Changed
- `GenericRestClient._blockRequestUntil` is now called every time when the request is on top of the pending requests queue rather than only once 
- If `GenericRestClient._blockRequestUntil` rejects, the whole request is properly rejected
- All the `assert`s now properly clear the request queues before throwing 

