class ValidationException extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ValidationException';
    this.httpStatus = 400;
  }
}

module.exports = ValidationException;
