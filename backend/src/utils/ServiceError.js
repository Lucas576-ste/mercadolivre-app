class ServiceError extends Error {
  constructor(mensagem, status = 500, detalhe = null) {
    super(mensagem);
    this.name = 'ServiceError';
    this.status = status;
    this.detalhe = detalhe;
  }
}

module.exports = ServiceError;
