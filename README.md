# Litescript

Litescript is a transpiler that processes `.ls` files and converts them to JavaScript, designed to simplify JavaScript syntax.

## Installation

```bash
npm install
npm link  # Makes the lite command available globally
```

## Usage

### Execute a File

Execute a `.ls` file directly:

```bash
lite input.ls
```

The code will be transpiled and executed immediately.

### Watch Mode

Watch for file changes and automatically re-execute:

```bash
lite input.ls --watch
```

## Options

- `-w, --watch` - Watch for file changes and re-execute automatically
- `-h, --help` - Show help message

## Examples

```bash
# Execute main.ls
lite main.ls

# Watch mode for development
lite main.ls --watch
```

## Development

This is the initial setup of the transpiler. Language features will be added incrementally.

## License

ISC
