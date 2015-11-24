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
    '  --recursive, -r      recursively include subdirectories, default "false"',
    '  --parent, -p         an asset id to import the files under, default "1"',
    '  --link, -l           the link type all assets will be imported as, default "TYPE_1"',
    '  --unrestricted, -u   whether unrestricted access is allowed, default "false"',
    '  --verbose, -v        whether to print bundler activity, default "false"',
    '',
    'Examples:',
    '  matrix-bundler ./files ./files.tgz',
    '  matrix-bundler --entry ./files --link 2 --unrestricted --output ./files.tgz'
  ].join('\n')
}

function cli (opts) {
  var readdirp = require('readdirp')
  var Bundler = require('node-matrix-bundler')
  var writer = require('node-matrix-importer')({ sorted: true })
  var path = require('path')
  var fs = require('fs')

  var bundle = Bundler({
    writer: writer,
    globalLinkType: opts.linkType,
    globalRootNode: opts.rootNode,
    globalUnrestricted: opts.unrestricted
  })
  var entries = readdirp({
    root: path.resolve(process.cwd(), opts.entry),
    fileFilter: ['!.*'], // ignore hidden files
    directoryFilter: opts.recursive ? ['!.*'] : ['!.*', '!*'], // ignore hidden folders
    entryType: 'both'
  })
  var output = opts.verbose ? console.log : function noop () {}
  var folders = {}

  entries
    .on('data', function processFile (entry) {
      var fullPath = entry.fullPath
      var fullParentDir = entry.fullParentDir
      var opts = {}

      if (!~Object.keys(folders).indexOf(fullParentDir)) {
        folders[fullParentDir] = createFolder(
          path.basename(fullParentDir),
          folders[path.resolve(fullParentDir, '../')] || bundle.globalRootNode
        ).id
      }

      opts['parentId'] = folders[fullParentDir]

      if (entry.stat.isFile()) {
        output(fullPath)
        bundle.add(fullPath, opts)
      }
    })
    .on('end', function createBundle () {
      bundle.createBundle()
        .pipe(fs.createWriteStream(opts.output))
    })

  function createFolder (name, parentId) {
    var folder = writer.createAsset({
      parentId: parentId,
      type: 'folder'
    })
    var folderId = folder.id

    writer.setAttribute({
      assetId: folderId,
      attribute: 'name',
      value: name
    })

    writer.addPath({
      assetId: folderId,
      path: name
    })

    return folder
  }
}

if (argv.version || argv.v) {
  console.log(version())
} else if (!argv._.length || argv.h || argv.help) {
  console.log(help())
} else {
  cli({
    entry: argv.entry || argv.e || argv._[0] || './',
    output: argv.output || argv.o || argv._[1] || './bundle.tgz',
    recursive: argv.recursive || argv.r,
    rootNode: argv.parent || argv.p,
    linkType: argv.link || argv.l,
    unrestricted: argv.unrestricted || argv.u,
    verbose: argv.verbose || argv.v
  })
}
