# Lambda Logger

A comprehensive, production-ready and highly configurable logging library designed specifically for AWS Lambda functions built with TypeScript. Features numerical log levels, automatic log enrichment, multiple destinations, complete configurability, and complete abstraction of logging details.

[![npm version](https://img.shields.io/npm/v/@nicknaddaf/lambda-logger.svg)](https://www.npmjs.com/package/@nicknaddaf/lambda-logger)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

✅ **Numerical Log Levels** - Industry-standard priority scale (0=FATAL to 5=TRACE)  
✅ **Structured Logging** - JSON-formatted logs with consistent structure  
✅ **Multiple Destinations** - CloudWatch, S3, Console, File, or custom destinations  
✅ **Auto-Enrichment** - AWS Lambda context, X-Ray tracing, and custom enrichers  
✅ **Type-Safe** - Full TypeScript support with strong typing  
✅ **Configurable** - Flexible formatters, log levels, and destinations  
✅ **Sensitive Data Redaction** - Automatic redaction of passwords, tokens, etc.  
✅ **Batching & Buffering** - Efficient log delivery with configurable batching  
✅ **Zero Core Dependencies** - Only AWS SDK as peer dependency

## Installation

```bash
npm install @nicknaddaf/lambda-logger
```

## Contributing

Contributions are welcome! Please submit pull requests or open issues on GitHub.

## License

MIT License - See LICENSE file for details.

## Support

-   🐛 Issues: https://github.com/nicknaddaf/lambda-logger/issues
-   📚 Documentation: https://github.com/nicknaddaf/lambda-logger/docs

---

## Changelog

### v0.1.0

-   Initial release
-   Numerical log levels (0-5)
-   Multiple destinations support
-   AWS Lambda enrichers
-   Automatic sensitive data redaction
-   TypeScript support

### v0.2.0

-   Fix package configuration issue with JavaScript code
-   Add documentation section
