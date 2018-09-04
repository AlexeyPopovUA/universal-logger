import ILoggerConfiguration from "./interface/ILoggerConfiguration";
import IService from "./interface/IService";
import IStrategy from "./interface/IStrategy";
import LogStore from "./LogStore";

/**
 * Uses different strategies to submit logs to log server via Service facade.
 */
export default class AdvancedLogger {
    private configuration: ILoggerConfiguration;
    private strategy: IStrategy;
    private service: IService;
    private logStore: LogStore;

    constructor(configuration: ILoggerConfiguration) {
        this.configuration = configuration;
        this.logStore = new LogStore();
        this.strategy = this.configuration.strategy;
        this.service = this.configuration.service;

        // todo Where is it better to subscribe?
        this.logStore.eventEmitter.on("add", this.onAdd.bind(this));
        this.logStore.eventEmitter.on("clear", this.onClear.bind(this));
        this.logStore.eventEmitter.on("error", this.onStoreError.bind(this));

        this.strategy.eventEmitter.on("send", this.onSend.bind(this));
        this.strategy.eventEmitter.on("error", this.onStrategyError.bind(this));
    }

    public log(log: any): void {
        this.logStore.add(log);
    }

    /**
     * Forces strategy to initiate logs sending
     */
    public sendAllLogs(): void {
        this.strategy.sendAll();
    }

    public destroy(): void {
        this.logStore.destroy();
        this.logStore = null;
        this.strategy.destroy();
        this.strategy = null;
        this.service.destroy();
        this.service = null;
        this.configuration = null;
    }

    private onStoreError(error: Error): void {
        console.error(error);
    }

    private onAdd(info: any) {
        this.strategy.onAdd(info);
    }

    private onClear(info: any) {
        this.strategy.onClear();
    }

    private onStrategyError(error: Error): void {
        console.error(error);
    }

    private onSend(): void {
        const logs = this.logStore.getAll();

        // We need to clear store as soon as we received request to send all logs
        this.logStore.clear();

        this.service.sendAllLogs(logs)
            .catch(error => {
                console.log(error);
                // todo Retry sending logs here or in the service
            });
    }
}