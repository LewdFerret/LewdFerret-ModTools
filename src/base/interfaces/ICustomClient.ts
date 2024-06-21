import { IConfig } from "./IConfig";

export default interface ICustomClient {
    config: IConfig;

    Init(): void;
    LoadHandlers(): void;
}
