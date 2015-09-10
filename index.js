#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2))

function version () {
  return require('./package.json').version
}

function help () {
  return [
    'Usage:',
    '  matrix-bundler [entry] [output] [opts]',
    '',
    'Options:',
    '  --help, -h           show help message',
    '  --version, -v        show version information',
    '  --entry, -e          the entry point for bundler, default "."',
    '  --output, -o         the exported file bundle, default "./bundle.tgz"',
    '  --parent, -p         an asset id to import the files under, default "1"',
    '  --link, -l           the link type all assets will be imported as, default "TYPE_1"',
    '  --unrestricted, -u   whether unrestricted access is allowed, default "false"',
    '',
    'Examples:',
    '  matrix-bundler ./files ./files.tgz',
    '  matrix-bundler --entry ./files --link 2 --unrestricted --output ./files.tgz'
  ].join('\n')
}

function cli (opts) {
  var readdirp = require('readdirp')
  var Bundler = require('node-matrix-bundler')
  var writer = require('node-matrix-importer')()
  var path = require('path')
  var fs = require('fs')

  if (!opts.rootNode) {
    opts.rootNode = writer.createAsset({
      type: 'folder'
    }).id

    writer.setAttribute({
      assetId: opts.rootNode,
      attribute: 'name',
      value: path.basename(path.resolve(__dirname, opts.entry))
    })

    writer.setAttribute({
      assetId: opts.rootNode,
      attribute: 'short_name',
      value: path.basename(path.resolve(__dirname, opts.entry))
    })

    writer.addPath({
      assetId: opts.rootNode,
      path: path.basename(path.resolve(__dirname, opts.entry))
    })
  }

  var bundle = Bundler({
    writer: writer,
    globalLinkType: opts.linkType,
    globalRootNode: opts.rootNode,
    globalUnrestricted: opts.unrestricted
  })
  var files = readdirp({
    root: opts.entry,
    fileFilter: ['!.*'] // ignore hidden files
  })

  files
    .on('data', function processFile (file) {
      bundle.add(file.fullPath)
    })
    .on('end', function createBundle () {
      bundle.createBundle()
        .pipe(fs.createWriteStream(opts.output))
    })
}

if (argv.version || argv.v) {
  console.log(version())
} else if (!argv._.length || argv.h || argv.help) {
  console.log(help())
} else {
  cli({
    entry: argv.entry || argv.e || argv._[0] || './',
    output: argv.output || argv.o || argv._[1] || './bundle.tgz',
    rootNode: argv.parent || argv.p,
    linkType: argv.link || argv.l,
    unrestricted: argv.unrestricted || argv.u
  })
}
