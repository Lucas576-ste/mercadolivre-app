class ValidationException extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ValidationException';
  }
}

module.exports = ValidationException;
