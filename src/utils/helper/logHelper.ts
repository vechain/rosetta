import log4js = require('log4js');
import path = require('path');
import * as Router from 'koa-router';
import { iBaseConfig, EnvType } from '../components/baseGlobalEnvironment';

const format = require('string-format');
const noop = function (): void { return; };
const noopLogger = {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    setLevel: noop
  };


export class LogHelper
{
    public init(environmentConfig:iLogHelperConfig){
        if(environmentConfig.logLevel != undefined){
            this._environmentConfig = environmentConfig;
            log4js.addLayout('json', function (config) {
                return function (logEvent) { return JSON.stringify(logEvent); }
            });
            log4js.configure(this.initConfig(this._environmentConfig));
            const logger = log4js.getLogger('default');
            console.trace = logger.trace.bind(logger);
            console.debug = logger.debug.bind(logger);
            console.info = logger.info.bind(logger);
            console.warn = logger.warn.bind(logger);
            console.error = logger.error.bind(logger);
        }
        else{
            console.log("此环境目前不支持:" + environmentConfig.logLevel + ",目前支持dev、test、prod");
        }


        if(environmentConfig.logEnvLevel != EnvType.TEST){
            this._environmentConfig = environmentConfig;
            log4js.configure(this.initConfig(this._environmentConfig));
            const logger = log4js.getLogger('default');
            console.trace = logger.trace.bind(logger);
            console.debug = logger.debug.bind(logger);
            console.info = logger.info.bind(logger);
            console.warn = logger.warn.bind(logger);
            console.error = logger.error.bind(logger);
        }
    }
    public healthLogger(){
        var loggerhealth = log4js.getLogger('health');
        loggerhealth.warn("alive");
    }

    private static readonly DEFAULT_ELK: string = '{remoteAdd} {requestTime} "{method} {url} HTTP/{httpVersion}" {status} {contentLength} {responseTime} {body}';
    private static readonly DEBUG_FORMAT:string = '{remoteAdd} {requestTime} "{method} {url} Headers:{header}]Body:[{body} QueryString:{querystring} HTTP/{httpVersion} {status} {contentLength} {responseTime} Response {response}';


    public httpLogger: Router.IMiddleware = async (ctx: Router.IRouterContext, next: () => Promise<any>) => {
        let querystring= ctx.querystring;
        let requestBody = ctx.request.body;
        let responseBody;
        if(ctx.querystring){
            querystring = ctx.querystring;
        }
        if(ctx.request.body != undefined){
            requestBody = ctx.request.body;
        }
        let parames = {
            remoteAdd: ctx.headers['x-forwarded-for'] || (ctx as any).ip || ctx.ips || (ctx.socket && (ctx.socket.remoteAddress || ((ctx as any).socket.socket && (ctx as any).socket.socket.remoteAddress))),
            method: ctx.method,
            body: JSON.stringify(ctx.request.body),
            url: ctx.originalUrl,
            httpVersion: ctx.req.httpVersionMajor + '.' + ctx.req.httpVersionMinor,
            status: ctx.status || ctx.response.status || ctx.res.statusCode,
            contentLength: (ctx.response.headers && ctx.response.headers['content-length']) || (ctx.response.headers && ctx.response.headers['Content-Length']) || ctx.response.length || '-',
            responseTime: 0,
            response: {},
            header: JSON.stringify(ctx.request.headers),
            requestTime: (new Date()).toISOString()
        };
        let logLevel: LogHelperLevel = LogHelperLevel.INFO;
        let start = new Date().getTime();
        await next();
        let end = new Date().getTime();
        if (String(parames.remoteAdd).startsWith("::ffff:")) {
            let remoteAdd: string = parames.remoteAdd;
            parames.remoteAdd = remoteAdd.replace("::ffff:", "");
        }
        parames.responseTime = (end - start) / 1000;
        parames.status = ctx.status || ctx.response.status || ctx.res.statusCode;
        if(ctx.body != undefined){
            responseBody = ctx.body;
        }
        parames.response = JSON.stringify(responseBody);
        if (parames.status >= 300) { logLevel = LogHelperLevel.WARN };
        if (parames.status >= 400) { logLevel = LogHelperLevel.WARN };
        if (parames.status >= 500) { logLevel = LogHelperLevel.ERROR };
        let logMessage = format(LogHelper.DEFAULT_ELK, parames);
        let debuglogMessage = format(LogHelper.DEBUG_FORMAT, parames);
        let logger = log4js.getLogger("http");

        switch (this._environmentConfig.logLevel) {
            case "dev": {
                switch (logLevel as LogHelperLevel) {
                    case LogHelperLevel.TRACE: {
                        this.log(LogHelperLevel.TRACE,debuglogMessage);
                        break;
                    }
                    case LogHelperLevel.DEBUG: {
                        this.log(LogHelperLevel.DEBUG,debuglogMessage);
                        break;
                    }
                    case LogHelperLevel.INFO: {
                        this.log(LogHelperLevel.INFO,debuglogMessage);
                        break;
                    }
                    case LogHelperLevel.WARN: {
                        this.log(LogHelperLevel.WARN,debuglogMessage);
                        break;
                    }
                    case LogHelperLevel.ERROR: {
                        this.log(LogHelperLevel.ERROR,debuglogMessage);
                        break;
                    }
                }
                break;
            }
            case "test": {
                switch (logLevel as LogHelperLevel) {
                    case LogHelperLevel.TRACE: {
                        this.log(LogHelperLevel.TRACE,logMessage);
                        break;
                    }
                    case LogHelperLevel.DEBUG: {
                        this.log(LogHelperLevel.DEBUG,logMessage);
                        break;
                    }
                    case LogHelperLevel.INFO: {
                        this.log(LogHelperLevel.DEBUG,logMessage);
                        break;
                    }
                    case LogHelperLevel.WARN: {
                        this.log(LogHelperLevel.WARN,debuglogMessage);
                        break;
                    }
                    case LogHelperLevel.ERROR: {
                        this.log(LogHelperLevel.ERROR,debuglogMessage);
                        break;
                    }
                }
                break;
            }
            case "prod": {
                switch (logLevel as LogHelperLevel) {
                    case LogHelperLevel.TRACE: {
                        this.log(LogHelperLevel.TRACE,logMessage);
                        break;
                    }
                    case LogHelperLevel.DEBUG: {
                        this.log(LogHelperLevel.DEBUG,logMessage);
                        break;
                    }
                    case LogHelperLevel.INFO: {
                        this.log(LogHelperLevel.INFO,logMessage);
                        break;
                    }
                    case LogHelperLevel.WARN: {
                        this.log(LogHelperLevel.WARN,logMessage);
                        logger.warn(logMessage);
                        break;
                    }
                    case LogHelperLevel.ERROR: {
                        this.log(LogHelperLevel.ERROR,logMessage);
                        break;
                    }
                }
                break;
            }
            default: {
                switch (logLevel as LogHelperLevel) {
                    case LogHelperLevel.TRACE: {
                        this.log(LogHelperLevel.TRACE,logMessage);
                        break;
                    }
                    case LogHelperLevel.DEBUG: {
                        this.log(LogHelperLevel.DEBUG,debuglogMessage);
                        break;
                    }
                    case LogHelperLevel.INFO: {
                        this.log(LogHelperLevel.INFO,debuglogMessage);
                        break;
                    }
                    case LogHelperLevel.WARN: {
                        this.log(LogHelperLevel.WARN,debuglogMessage);
                        break;
                    }
                    case LogHelperLevel.ERROR: {
                        this.log(LogHelperLevel.ERROR,debuglogMessage);
                        break;
                    }
                }
                break;
            }
        }
    };

    public log(level: LogHelperLevel, message: string, ...args: any[]) {
        let log = log4js.getLogger("default");
        let lgoData: any = {
            time: (new Date()).toISOString(),
            level: level,
            catalog: this._environmentConfig.serviceName,
            app_name: this._environmentConfig.serviceName,
            msg: message
        }
        if (args) {
            if (args[0] && typeof (args[0] instanceof TypeError)) {
                let error = args[0]
                lgoData.err = {
                    message: error.message,
                    stack: error.stack
                }
            }
        }

        switch (level) {
            case LogHelperLevel.TRACE: {
                log.trace(lgoData);
                break;
            }
            case LogHelperLevel.DEBUG: {
                log.debug(lgoData);
                break;
            }
            case LogHelperLevel.INFO: {
                log.info(lgoData);
                break;
            }
            case LogHelperLevel.WARN: {
                log.warn(lgoData);
                break;
            }
            case LogHelperLevel.ERROR: {
                log.error(lgoData);
                break;
            }
        }
    }

    public trace(message: string, ...args: any[]){
        this.log(LogHelperLevel.TRACE,message,args);
    }

    public debug(message: string, ...args: any[]){
        this.log(LogHelperLevel.DEBUG,message,args);
    }

    public info(message: string, ...args: any[]){
        this.log(LogHelperLevel.INFO,message,args);
    }

    public warn(message: string, ...args: any[]){
        this.log(LogHelperLevel.WARN,message,args);
    }

    public error(message: string, ...args: any[]){
        this.log(LogHelperLevel.ERROR,message,args);
    }

    private initConfig(environmentConfig: any): log4js.Configuration {
        let serviceName = environmentConfig.serviceName;
        let logDir = path.join(__dirname, "../../../log/", serviceName);
        let log4jsConfig: log4js.Configuration = {
            pm2: true,
            appenders: {
                console: {
                    type: "console"
                },
                file: {
                    type: "file",
                    filename: path.join(logDir, serviceName + ".log"),
                    maxLogSize: 104857600,
                    backups: 100,
                    layout: { type: 'json' }
                },
                healthfile: {
                    type: "file",
                    maxLogSize: 64,
                    backups:1,
                    filename: path.join(logDir, 'health.log'),
                    layout: { type: 'json' }
                },
                http: {
                    type: 'dateFile',
                    filename: path.join(logDir, "access.log"),
                    pattern: '-yyyy-MM-dd',
                    alwaysIncludePattern: true,
                },
                error: {
                    type: 'file',
                    level: 'ERROR',
                    filename: path.join(logDir, "error.log"),
                    maxLogSize: 10485760,
                    backups: 100,
                    layout: { type: 'json' }
                }
            },
            categories: {
                default: {
                    appenders: ["file", "console", "error"],
                    level: "all"
                },
                http: {
                    appenders: ["console", "error"],
                    level: "all"
                },
                health: {
                    appenders: ["healthfile"],
                    level: "info"
                }
            }
        }
        return log4jsConfig;
    }

    private _environmentConfig:any;
}

export enum LogHelperLevel
{
    TRACE = "trace",
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}

export interface iLogHelperConfig extends iBaseConfig
{
    logLevel:LogHelperLevel;
    logEnvLevel:EnvType;
}