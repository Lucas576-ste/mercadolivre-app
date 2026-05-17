class ConflictException extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ConflictException';
    this.httpStatus = 409;
  }
}

module.exports = ConflictException;
