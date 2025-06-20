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
      templateId: string;
      createArgument: Record<string, any>;
      witnessParties: string[];
      signatories: string[];
      observers: string[];
      createdAt: string;
      packageName: string;
    };
  };
}

export interface ExercisedTreeEvent {
  ExercisedTreeEvent: {
    value: {
      contractId: string;
      templateId: string;
      choice: string;
      choiceArgument: Record<string, any>;
      actingParties: string[];
      witnessParties: string[];
      exerciseResult: {
        [key: string]: any;
      };
      packageName: string;
      consuming: boolean;
    };
  };
}

export interface ArchivedTreeEvent {
  ArchivedTreeEvent: {
    value: {
      contractId: string;
      templateId: string;
      witnessParties: string[];
      packageName: string;
    };
  };
}

export type TreeEvent =
  | CreatedTreeEvent
  | ExercisedTreeEvent
  | ArchivedTreeEvent;

export interface TransactionTree {
  updateId: string;
  effectiveAt: string;
  offset: string;
  eventsById: {
    [key: string]: TreeEvent;
  };
  recordTime: string;
  synchronizerId: string;
}

export interface CommandResponse {
  transactionTree: TransactionTree;
}

export interface CreateContractResponse {
  contractId: string;
  updateId: string;
}

export interface UpdateByIdRequest {
  updateId: string;
  requestingParties: string[];
  updateFormat: string;
  includeTransactions: boolean;
}

export interface UpdateByIdResponse {
  update: TransactionTree;
}
