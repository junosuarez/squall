var extend = require('xtend')
var cluster = require('cluster')
var Promise = require('bluebird')
var logger

function noop () {}

var defaults = {
  init: noop,
  leader: maxCpusStrategy,
  end: noop,
  logger: console
}

function squall (opts) {
  if (!opts || typeof opts.worker !== 'function' ) {
    throw new TypeError('opts.worker must be a function')
  }
  
  var config = extend(opts, defaults)
  logger = config.logger
  
  if (cluster.isWorker) {
    config.worker()
  } else {
    Promise.resolve(config.init())
    .then(config.leader(config))
  }

  return cluster
}

function maxCpusStrategy (config) {
  var numberOfWorkers = require('os').cpus().length
  var ended = false

  for (var i = 0; i < numberOfWorkers; i++) {
    cluster.fork()
  }

  cluster.on('online', function (worker) {
    logger.log('cluster worker running (pid=' + worker.process.pid + ')')
  })

  cluster.on('exit', function (worker) {
    logger.log('cluster worker died (pid=' + worker.process.pid + ').')
    if (!ended && Object.keys(cluster.workers).length === 0) {
      console.log('x')
      ended = true
      config.end()
    }
  })
}

function maxCpusRestartStrategy () {
  var numberOfWorkers = require('os').cpus().length

  for (var i = 0; i < numberOfWorkers; i++) {
    cluster.fork()
  }

  cluster.on('online', function (worker) {
    logger.log('cluster worker running (pid=' + worker.process.pid + ')')
  })

  cluster.on('exit', function (worker) {
    logger.log('cluster worker died (pid=' + worker.process.pid + '). restarting.')

    cluster.fork()
  })
}



module.exports = squall
module.exports.maxCpusStrategy = maxCpusStrategy
module.exports.maxCpusRestartStrategy = maxCpusRestartStrategy