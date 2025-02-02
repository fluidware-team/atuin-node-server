
## Environment variables

| ENV                                          |     type |               default | required |                                                                                            notes |
| -------------------------------------------- | -------- | --------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| NATUIN_ADMIN_TOKEN                           |   string |                       |          |                                                                                                  |
| NATUIN_DB_HOST                               |   string |             localhost |          |                                                                                                  |
| NATUIN_DB_NAME                               |   string |                 atuin |          |                                                                                                  |
| NATUIN_DB_PASSWORD                           |   string |                 atuin |          |                                                                                                  |
| NATUIN_DB_PORT                               |  integer |                  3306 |          |                                                                                                  |
| NATUIN_DB_USERNAME                           |   string |                 atuin |          |                                                                                                  |
| NATUIN_DISABLE_VERSION_CHECK                 |  boolean |                 false |          |                                                                                                  |
| NATUIN_EMAIL_FROM                            |   string |    natuin@example.com |          | the email address to use as sender. required only if ATUIN_REGISTRATION_EMAIL_VALIDATION is true |
| NATUIN_INVITATION_MODE                       |   string |                 close |          |                                        the invitation mode. one of 'close', 'open', 'admin-only' |
| NATUIN_KEY_PREFIX                            |   string |                natuin |          |                                                                                                  |
| NATUIN_MAX_HISTORY_DATA_SIZE                 |  integer |                 32768 |          |                                                    the maximum size of the history data in bytes |
| NATUIN_OPEN_REGISTRATION                     |  boolean |                 false |          |                                                                                                  |
| NATUIN_PAGE_SIZE                             |  integer |                  1100 |          |                                                                                                  |
| NATUIN_PASSWORD_MIN_LENGTH                   |  integer |                    16 |          |                                                                 the minimum length of a password |
| NATUIN_PASSWORD_REQUIRE_LOWERCASE            |  boolean |                  true |          |                                                            require at least one lowercase letter |
| NATUIN_PASSWORD_REQUIRE_NUMBER               |  boolean |                  true |          |                                                                      require at least one number |
| NATUIN_PASSWORD_REQUIRE_SPECIAL              |  boolean |                 false |          |                                                           require at least one special character |
| NATUIN_PASSWORD_REQUIRE_UPPERCASE            |  boolean |                 false |          |                                                            require at least one uppercase letter |
| NATUIN_REGISTRATION_EMAIL_DOMAINS_BLACKLIST  | string[] |                       |          |                                   comma separated list of email domains to disallow registration |
| NATUIN_REGISTRATION_EMAIL_DOMAINS_WHITELIST  | string[] |                       |          |                                      comma separated list of email domains to allow registration |
| NATUIN_REGISTRATION_EMAIL_VALIDATION         |  boolean |                 false |          |                                                                                                  |
| NATUIN_REGISTRATION_EMAIL_VALIDATION_TIMEOUT |   string |                    1d |          |                                                                                                  |
| NATUIN_SESSION_TTL_IN_DAYS                   |  integer |                     0 |          |                                                                                                  |
| NATUIN_SMTP_HOST                             |   string |                       |        * |    the hostname of the SMTP server. required only if ATUIN_REGISTRATION_EMAIL_VALIDATION is true |
| NATUIN_SMTP_PASSWORD                         |   string |                       |          |                                                                                                  |
| NATUIN_SMTP_POOL                             |  boolean |                 false |          |                                                                                                  |
| NATUIN_SMTP_PORT                             |  integer |                    25 |          |                                                                                                  |
| NATUIN_SMTP_SECURE                           |  boolean |                 false |          |                                                                                                  |
| NATUIN_SMTP_TLS_REJECT_UNAUTHORIZED          |  boolean |                  true |          |                                                                     do not fail on invalid certs |
| NATUIN_SMTP_USER                             |   string |                       |          |                                                                                                  |
| NODE_MODE                                    |   string |                       |          |                                                        set by the image builder, do not override |
| OPENAPI_VALIDATE_RESPONSE                    |  boolean |                  true |          |                                                                                                  |
| OPENAPI_VIEWER_PATH                          |   string |                 /docs |          |                                                                                                  |
| PUBLIC_URL                                   |   string | http://localhost:8080 |          |                                                                                                  |

## @fluidware-it/express-microservice@0.5.0

| ENV                           |     type |                        default | required |                                               notes |
| ----------------------------- | -------- | ------------------------------ | -------- | --------------------------------------------------- |
| APP_${appName}_ROLES          | string[] |                                |          |                          roles to assign to appName |
| APP_KEY_${appName}            |   string |                                |          |                        pre shared token for appName |
| FW_APP_DEFAULT_ROLES          | string[] |                          admin |          |                                                     |
| FW_MS_ADDRESS                 |   string |                                |          |                                                     |
| FW_MS_ADDRESSES               | string[] |                                |          |                                                     |
| FW_MS_CERT                    |   string |                                |          |                                                     |
| FW_MS_FORWARD_UNKNOWN_BEARER  |  boolean |                          false |          | forward unknown bearer token to the next middleware |
| FW_MS_HOSTNAME                |   string |                     _function_ |          |                               default to hostname() |
| FW_MS_JWT_PUBLIC_KEY          |   string |                                |          |                                                     |
| FW_MS_KEY                     |   string |                                |          |                                                     |
| FW_MS_LOG_404                 |  boolean |                          false |          |                                                     |
| FW_MS_MAX_UPLOAD_SIZE         |   string |                          128kb |          |                                                     |
| FW_MS_PORT                    |  integer |                           8080 |          |                                                     |
| FW_MS_PRE_SHARED_TOKEN_PREFIX |   string |                                |          |                                                     |
| FW_MS_TRUST_PROXY             | string[] | loopback,linklocal,uniquelocal |          |                                                     |

## @fluidware-it/httpclient@0.3.0-rc.0

| ENV                 |   type |                    default | required |    notes |
| ------------------- | ------ | -------------------------- | -------- | -------- |
| npm_package_name    | string |   @fluidware-it/httpclient |          |          |
| npm_package_version | string | MemberExpression_undefined |          |          |

## @fluidware-it/mysql2-client@0.6.1

| ENV                                |              type |    default | required |                                                                                                                notes |
| ---------------------------------- | ----------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| FW_${prefix}DB_CONN_OPTIONS        | unknown (envJSON) |            |          | JSON string with connection options See https://github.com/mysqljs/mysql#connection-options for all possible options |
| FW_${prefix}DB_HOST                |            string |  localhost |          |                                                                                                                      |
| FW_${prefix}DB_NAME                |            string | ${DB_USER} |          |                                                                                                                      |
| FW_${prefix}DB_PASSWORD            |            string |            |          |                                                                                                                      |
| FW_${prefix}DB_PASSWORD_FILE       |            string |            |          |                                                                                                                      |
| FW_${prefix}DB_PORT                |           integer |       3306 |          |                                                                                                                      |
| FW_${prefix}DB_USER                |            string |            |        * |                                                                                                                      |
| FW_DB_USE_READ_COMMITTED_ISOLATION |           boolean |      false |          |                                                                                                                      |

## @fluidware-it/saddlebag@0.1.1

| ENV                          |    type |                 default | required |    notes |
| ---------------------------- | ------- | ----------------------- | -------- | -------- |
| FW_LOGGER_ISO_TIMESTAMP      | boolean |                   false |          |          |
| FW_LOGGER_LEVEL              |  string |                    info |          |          |
| FW_LOGGER_NAME               |  string |              _function_ |          |          |
| FW_LOGGER_SEVERITY_AS_STRING | boolean |                   false |          |          |
| npm_package_name             |  string | @fluidware-it/saddlebag |          |          |
