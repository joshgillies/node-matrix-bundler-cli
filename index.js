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
    '  --lint               whether to return common issues with import xml, default false',
    '  --unrestricted, -u   whether unrestricted access is allowed, default "false"',
    '  --verbose, -v        whether to print bundler activity, default "false"',
    '',
    'Examples:',
    '  matrix-bundler ./files ./files.tgz',
    '  matrix-bundler --entry ./files --link 2 --unrestricted --output ./files.tgz'
  ].join('\n')
}

function cli (opts) {
  var EventEmitter = require('events').EventEmitter
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
    .on('end', function bundle () {
      if (opts.lint) {
        linter(writer.toString())
          .on('notice', function (notice) {
            console.log(notice)
          })
          .on('end', function () {
            createBundle(opts.output)
          })
      } else {
        createBundle(opts.output)
      }
    })

  function linter (source) {
    var parseString = require('xml2js').parseString
    var emitter = new EventEmitter()

    parseString(source, function (err, result) {
      // if there's an error here, something is seriously wrong
      if (err) throw err

      result.actions.action.forEach(function (action) {
        if (action.action_type[0] === 'create_asset') {
          if (action.parentid && action.parentid[0] === '1') {
            emitter.emit('notice', 'Top most root node (#1) in use.')
          }
        }
      })

      emitter.emit('end')
    })

    return emitter
  }

  function createBundle (output) {
    bundle.createBundle()
      .pipe(fs.createWriteStream(output))
  }

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
    lint: argv.lint,
    unrestricted: argv.unrestricted || argv.u,
    verbose: argv.verbose || argv.v
  })
}
