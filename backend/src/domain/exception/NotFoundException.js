class NotFoundException extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'NotFoundException';
    this.httpStatus = 404;
  }
}

module.exports = NotFoundException;
