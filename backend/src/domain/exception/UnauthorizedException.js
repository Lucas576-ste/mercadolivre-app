class UnauthorizedException extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'UnauthorizedException';
  }
}

module.exports = UnauthorizedException;
