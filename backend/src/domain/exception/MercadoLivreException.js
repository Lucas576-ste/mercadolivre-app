class MercadoLivreException extends Error {
  constructor(mensagem, detalhe = null) {
    super(mensagem);
    this.name = 'MercadoLivreException';
    this.detalhe = detalhe;
  }
}

module.exports = MercadoLivreException;
