export class AuthorizationError extends Error {
  constructor(message: string = "Missing Permission") {
    super(message)
    this.name = "AuthorizationError"
  }
}
