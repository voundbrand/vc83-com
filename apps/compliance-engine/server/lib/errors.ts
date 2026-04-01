export class ComplianceError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 500, code = "COMPLIANCE_ERROR") {
    super(message);
    this.name = "ComplianceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class PolicyDeniedError extends ComplianceError {
  readonly framework: string;
  readonly ruleId: string;

  constructor(message: string, framework: string, ruleId: string) {
    super(message, 403, "POLICY_DENIED");
    this.name = "PolicyDeniedError";
    this.framework = framework;
    this.ruleId = ruleId;
  }
}

export class NotFoundError extends ComplianceError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ComplianceError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
