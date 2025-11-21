class AppError extends Error {
  public status: number;

  constructor(status: number, message: string, stack = '') {
    super(message);
    this.status = status;

    if (stack) {
      this.stack = stack;
    } else {
      this.name = this.constructor.name;
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
}

export default AppError;
