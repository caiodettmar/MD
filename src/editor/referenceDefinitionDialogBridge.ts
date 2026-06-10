export interface ReferenceDefinitionDialogRequest {
  id: string;
  returnBlockIndex: number;
}

export type ReferenceDefinitionDialogHandler = (
  request: ReferenceDefinitionDialogRequest,
) => void;

let referenceDefinitionDialogHandler: ReferenceDefinitionDialogHandler | null =
  null;

export function setReferenceDefinitionDialogHandler(
  handler: ReferenceDefinitionDialogHandler | null,
) {
  referenceDefinitionDialogHandler = handler;
}

export function requestReferenceDefinitionDialog(
  request: ReferenceDefinitionDialogRequest,
) {
  referenceDefinitionDialogHandler?.(request);
}
