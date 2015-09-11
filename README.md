# node-matrix-bundler-cli

CLI tool to generate file bundles for import into Squiz Matrix systems

## Install

`npm install node-matrix-bundler-cli --global`

## Usage

```
matrix-bundler [entry] [output] [opts]

Options:
  --help, -h           show help message
  --version, -v        show version information
  --entry, -e          the entry point for bundler, default "."
  --output, -o         the exported file bundle, default "./bundle.tgz"
  --recursive, -r      recursively include subdirectories, default "false"
  --parent, -p         an asset id to import the files under, default "1"
  --link, -l           the link type all assets will be imported as, default "TYPE_1"
  --unrestricted, -u   whether unrestricted access is allowed, default "false"
```

## Examples

`matrix-bundler ./files ./files.tgz`

`matrix-bundler --entry ./files --link 2 --unrestricted --output ./files.tgz`

## Licence

MIT
