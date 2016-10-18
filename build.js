var fs = require('fs')
var execFileSync = require('child_process').execFileSync
var rimraf = require('rimraf')
var electronPackager = require('electron-packager')
var packageMsi = require('msi-packager')
var path = require('path')
var sign = require('electron-osx-sign')
var appdmg = process.platform === 'darwin' ? require('appdmg') : null

var buildFrom = __dirname + '/app'
var appPackage = require(buildFrom + '/package.json')

var platform = process.argv[2]
var arch = process.argv[3]
if (platform === 'darwin' && !arch) {
  arch = 'x64'
}
//
process.cwd(__dirname)
rimraf.sync('build')

electronPackager({
  dir: buildFrom,
  out: 'build',
  name: 'Ferment',
  arch: arch,
  overwrite: true,
  platform: platform,
  version: '1.4.3',
  appVersion: appPackage.version,
  prune: true,
  asar: true,
  icon: 'icon.ext',//,
  ignore: [
    'node_modules/sodium-prebuilt/deps',
    'node_modules/leveldown/deps',
    'node_modules/fsevents',
    'node_modules/node-gyp'
  ]
}, packageRelease)

function packageRelease (err) {
  if (err) throw err

  if (platform === 'darwin' || platform === 'all') {
    packageForMac()
  }

  if (platform === 'linux' || platform === 'all') {
    if (arch === 'ia32' || arch === 'all') {
      packageForLinux('ia32')
    }

    if (arch === 'x64' || arch === 'all') {
      packageForLinux('x64')
    }
  }

  if (platform === 'win32' || platform === 'all') {
    if (arch === 'ia32' || arch === 'all') {
      packageForWindows('ia32')
    }

    if (arch === 'ia32' || arch === 'all') {
      packageForWindows('x64')
    }
  }
}

function packageForMac () {
  var outputPath = 'releases/Ferment-v' + appPackage.version + '-mac.dmg'
  rimraf.sync(outputPath)

  console.log('Signing app bundle')

  var bundle = 'build/Ferment-darwin-x64/Ferment.app'
  //rimraf.sync(bundle + '/')

  sign({
    app: bundle
  }, function (err) {
    if (err) throw err
    console.log('Creating dmg')
    appdmg({
      basepath: __dirname,
      target: outputPath,
      specification: {
        'title': 'Ferment',
        'icon': 'dmg.icns',
        'background': 'dmg.png',
        'icon-size': 100,
        'contents': [
          { x: 430, y: 190, type: 'link', path: '/Applications' },
          { x: 170, y: 190, type: 'file', path: bundle }
        ]
      }
    }).on('finish', function () {
      console.log('Output to ' + path.resolve(outputPath))
    }).on('error', function (err) {
      throw err
    })
  })
}

function packageForWindows (arch) {
  console.log('Creating msi')
  var outputPath = arch === 'x64'
    ? 'releases/Ferment v' + appPackage.version + ' x64.msi'
    : 'releases/Ferment v' + appPackage.version + '.msi'

  packageMsi({
    source: 'build/Ferment-win32-' + arch,
    upgradeCode: '9426ec3a-a291-4c1e-a31b-2e2ac38b78c8',
    output: outputPath,
    arch: arch === 'ia32' ? 'x86' : 'x64',
    iconPath: 'icon.ico',
    name: 'Ferment',
    version: appPackage.version,
    manufacturer: 'ferment.audio',
    executable: 'Ferment.exe',
    localInstall: true
  }, function (err) {
    if (err) throw err
    console.log('Output to ' + path.resolve(outputPath))
  })
}

function packageForLinux (arch) {
  console.log('Creating zip')
  var buildPath = __dirname + '/build/Ferment-linux-' + arch
  var outputPath = __dirname + '/releases/Ferment-v' + appPackage.version + '-linux-' + arch + '.zip'
  rimraf.sync(outputPath)
  fs.writeFileSync(buildPath + '/LICENSE', fs.readFileSync(buildFrom + '/LICENSE'))
  fs.writeFileSync(buildPath + '/README.md', fs.readFileSync(buildFrom + '/README.md'))
  fs.writeFileSync(buildPath + '/version', appPackage.version)

  execFileSync('zip', ['-r', '-X', outputPath, 'Ferment-linux-' + arch], {
    cwd: __dirname + '/build'
  })
}
