export interface AuthResponse {
    access_token: string;
}

export interface CreateCommand {
    CreateCommand: {
        templateId: string;
        createArguments: Record<string, any>;
    };
}

export interface ExerciseCommand {
    ExerciseCommand: {
        templateId: string;
        contractId: string;
        choice: string;
        choiceArgument: Record<string, any>;
    };
}

export type Command = CreateCommand | ExerciseCommand;

export interface CommandRequest {
    commands: Command[];
    commandId: string;
    actAs: string[];
}

export interface CreatedTreeEvent {
    CreatedTreeEvent: {
        value: {
            contractId: string;
        };
    };
}

export interface TransactionTree {
    updateId: string;
    eventsById: {
        [key: string]: CreatedTreeEvent;
    };
}

export interface CommandResponse {
    transactionTree: TransactionTree;
}

export interface CreateContractResponse {
    contractId: string;
    updateId: string;
}
