(() => {
  const KEY = 'gdp_v1';
  const QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  const BASE_URL = 'https://alicerceschivinda-gif.github.io/gestor-divida-pessoal/';

  function loadQRLib() {
    if (window.QRCode) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-qr-lib]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = QR_LIB;
      script.async = true;
      script.dataset.qrLib = '1';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{"debt":{},"plan":[],"payments":[]}');
    } catch {
      return { debt: {}, plan: [], payments: [] };
    }
  }

  function selectedPayment() {
    const state = readState();
    const select = document.querySelector('#rp');
    const index = Number(select?.value);
    if (!Number.isInteger(index) || index < 0) return null;
    return state.payments?.[index] || null;
  }

  function validationUrl(code) {
    return `${BASE_URL}#validate=${encodeURIComponent(code)}`;
  }

  async function appendQRToReceipt() {
    const payment = selectedPayment();
    const paper = document.querySelector('#paper');
    if (!paper || !payment?.code) return;

    paper.querySelector('#validationBlock')?.remove();

    const block = document.createElement('div');
    block.id = 'validationBlock';
    block.style.cssText = 'margin-top:24px;padding-top:18px;border-top:1px solid #d0d5dd;display:flex;gap:18px;align-items:center;flex-wrap:wrap';

    const qrBox = document.createElement('div');
    qrBox.id = 'receiptQR';
    qrBox.style.cssText = 'width:150px;height:150px;display:flex;align-items:center;justify-content:center';

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:220px';

    const url = validationUrl(payment.code);
    info.innerHTML = `
      <h3 style="margin:0 0 8px">Validação do comprovativo</h3>
      <p style="margin:4px 0">Leia o QR Code com a câmara do telemóvel para confirmar a autenticidade deste registo.</p>
      <p style="margin:8px 0"><b>Código:</b> <span style="font-family:monospace">${payment.code}</span></p>
      <p style="margin:4px 0;font-size:.82rem;word-break:break-all">${url}</p>
    `;

    block.appendChild(qrBox);
    block.appendChild(info);
    paper.appendChild(block);

    try {
      await loadQRLib();
      qrBox.innerHTML = '';
      new QRCode(qrBox, {
        text: url,
        width: 150,
        height: 150,
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      qrBox.innerHTML = '<span style="font-size:.82rem">QR indisponível</span>';
    }

    const linkBox = document.querySelector('#vl');
    if (linkBox) linkBox.textContent = url;
  }

  const build = document.querySelector('#build');
  if (build) {
    build.addEventListener('click', () => {
      setTimeout(() => appendQRToReceipt(), 100);
    });
  }

  window.addEventListener('beforeprint', () => {
    appendQRToReceipt();
  });
})();
