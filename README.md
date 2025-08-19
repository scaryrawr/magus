# Magus

![Coverage](https://img.shields.io/badge/coverage-21.38%25-red)

This project is heavily inspired by [sst/opencode](https://github.com/sst/opencode).

This is an in progress implementation of a monorepo for composable agentic tools.

## Development

### Testing & Coverage

```bash
# Run all tests
yarn test

# Run tests with coverage (per package)
yarn test:coverage

# Run tests with merged coverage report
yarn test:coverage:merged
```

Coverage reports are automatically generated for pull requests and include:

- 📊 Interactive HTML reports
- 📈 Coverage trend analysis
- 🎯 Automatic PR comments with coverage status

**Coverage Guidelines:**

- 🟢 Good: ≥80% coverage
- 🟡 Okay: 60-79% coverage
- 🔴 Needs Work: <60% coverage
