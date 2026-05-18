class ConflictException extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ConflictException';
  }
}

module.exports = ConflictException;
