export class Diary {

  constructor(config) {
    this.reporters = {};

    // {
    //   ConsoleReporter: { info: '*', debug: 'http' }
    // }

    for (var reporterId in config) {
      var reporterConfig = config[reporterId];
      var reporter = new Diary.reporters[reporterId](reporterConfig);
      this.reporters[reporterId] = {reporter: reporter, config: reporterConfig};
    }
  }


  log(level, componentId, message) {
    for (var reporterId in this.reporters) {
      var {reporter, config} = this.reporters[reporterId];

      if (config[level]) {
        var components = config[level];
        if (components === '*' || components.indexOf(level) !== -1) {
          reporter.handleEvent(level, componentId, message);
        }
      }
    }
  }

//  fatal(componentId, message) { log('fatal', componentId, message) }
//  error(componentId, message) { log('error', componentId, message) }
//  warn(componentId, message) { log('warn', componentId, message) }
//  info(componentId, message) { log('info', componentId, message) }
//  trace(componentId, message) { log('trace', componentId, message) }
//  debug(componentId, message) { log('debug', componentId, message) }
}

Diary.registerReporter = function(reporterId, reporterConstructor) {
  Diary.reporters[reporterId] = reporterConstructor;
}

Diary.reporters = {};

Diary.config = (config) => {
  Diary.rootLogger = new Diary(config);
}

Diary.log = function() {
  Diary.rootLogger.log.apply(Diary.rootLogger, arguments);
}

