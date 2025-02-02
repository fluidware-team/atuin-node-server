# Natuin

Natuin is an alternative to [atuin](https://atuin.sh) server

## Features

- [x] administrator interface
  - [x] user deletion
  - [x] user creation
  - [x] user enable/disable
- [ ] account management
  - [x] password reset
  - [ ] email change
- [x] registration
  - [x] email verification
  - [x] domain whitelist
  - [x] domain blacklist
  - [x] invite system
  - [x] password rules (min length, special characters, etc.)
- [ ] session management via tokens
  - [x] token expiration
  - [x] token deletion
  - [x] token creation
  - [ ] token renewal
- [ ] multiple databases
  - [x] mariadb
  - [ ] sqlite
  - [ ] postgres
- [x] opentelemetry
  - [x] tracing
  - [x] metrics

## Installation

### Requirements

- OCI runtime (docker, podman, etc.)
