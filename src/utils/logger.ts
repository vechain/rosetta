import log4js from "log4js";
import path from "path";

export class Logger {
    public constructor(env:any) {
        this.env = env;
        this.serviceName = this.env.config.serviceName;
        this.initLogConfig();
    }

    public async httpLoggerMiddleware(ctx:any, next: () => Promise<any>){
        let params = {
            remoteAdd: ctx.headers['x-forwarded-for'] || (ctx as any).ip || ctx.ips || (ctx.socket && (ctx.socket.remoteAddress || ((ctx as any).socket.socket && (ctx as any).socket.socket.remoteAddress))),
            method: ctx.method,
            body: JSON.stringify(ctx.request.body),
            url: ctx.originalUrl,
            status: ctx.status || ctx.response.status || ctx.res.statusCode,
            responseTime: 0,
            response: {},
            header: JSON.stringify(ctx.request.headers),
            requestTime: (new Date()).toISOString()
        }
        let logLevel = 'INFO';
        const startTs = new Date().getTime();
        await next();
        const endTs = new Date().getTime();
        if (String(params.remoteAdd).startsWith("::ffff:")) {
            let remoteAdd: string = params.remoteAdd;
            params.remoteAdd = remoteAdd.replace("::ffff:", "");
        }
        params.responseTime = (endTs - startTs);
        params.status = ctx.status || ctx.response.status || ctx.res.statusCode;
        if(ctx.body != undefined){
            params.response = JSON.stringify(ctx.body);
        }
        if (params.status >= 300) { logLevel = 'WARN' };
        if (params.status >= 400) { logLevel = 'WARN' };
        if (params.status >= 500) { logLevel = 'ERROR' };
        let logMessage = `${params.remoteAdd} ${params.requestTime} ${params.method} ${params.url} ${params.responseTime} ${params.body} ${params.status}`;
        let debuglogMessage = `${params.remoteAdd} ${params.requestTime} ${params.method} ${params.url} ${params.responseTime} ${params.header} ${params.body} ${params.status} ${params.response}`;

        switch (this.env.config.logLevel) {
            case "dev": {
                switch (logLevel) {
                    case 'INFO':
                        console.info(debuglogMessage);
                        break;
                    case 'WARN':
                        console.warn(debuglogMessage);
                        break;
                    case 'ERROR':
                        console.error(debuglogMessage);
                        break;
                }
                break;
            }
            case "test": {
                switch (logLevel) {
                    case 'INFO':
                        console.info(logMessage);
                        break;
                    case 'WARN':
                        console.warn(debuglogMessage);
                        break;
                    case 'ERROR':
                        console.error(debuglogMessage);
                        break;
                }
                break;
            }
            case "prod": {
                switch (logLevel) {
                    case 'INFO':
                        console.info(logMessage);
                        break;
                    case 'WARN':
                        console.warn(logMessage);
                        break;
                    case 'ERROR':
                        console.error(debuglogMessage);
                        break;
                }
                break;
            }
            default: {
                switch (logLevel) {
                    case 'INFO':
                        console.info(logMessage);
                        break;
                    case 'WARN':
                        console.warn(logMessage);
                        break;
                    case 'ERROR':
                        console.error(debuglogMessage);
                        break;
                }
                break;
            }
        }

    }

    private initLogConfig():log4js.Configuration{
        const logDir = path.join(__dirname,'../../log/',);
        const logConfig:log4js.Configuration = {
            pm2: true,
            appenders: {
                console: {
                    type: "console"
                },
                file: {
                    type: "file",
                    filename: path.join(logDir, this.serviceName + ".log"),
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
        };
        return logConfig;
    }

    private env:any;
    private serviceName:string;
}