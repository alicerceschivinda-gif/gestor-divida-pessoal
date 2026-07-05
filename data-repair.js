(() => {
  const KEY='gdp_v1';
  const REPAIR_VERSION='repair_20260705_1';

  const REAL_STATE={
    debt:{
      creditor:'DOMINGOS JOAO SASSI',
      debtor:'ANTONIO BARTOLOMEU ALICERCES CH EDUARDO',
      amount:18000000,
      start:'2026-03-03',
      desc:'Regularização de dívida pessoal',
      notes:'Pagamento inicial de 10.000.000 Kz em 03/03/2026; saldo de 8.000.000 Kz sujeito a plano de regularização.'
    },
    plan:[
      {no:1,date:'2026-04-03',amount:888889},
      {no:2,date:'2026-05-03',amount:888889},
      {no:3,date:'2026-06-03',amount:888889},
      {no:4,date:'2026-07-03',amount:888889},
      {no:5,date:'2026-08-03',amount:888889},
      {no:6,date:'2026-09-03',amount:888889},
      {no:7,date:'2026-10-03',amount:888889},
      {no:8,date:'2026-11-03',amount:888889},
      {no:9,date:'2026-12-03',amount:888888}
    ],
    payments:[
      {date:'2026-03-03',amount:10000000,installment:'Inicial',bank:'BAI',ref:'6963858447',fileName:'1_PRESTACAO_03_MARCO_Comprovativo.pdf',note:'Pagamento inicial',code:'GDP-20260303-001'},
      {date:'2026-04-03',amount:1000000,installment:1,bank:'Banco BIC',ref:'10636795',fileName:'2_PRESTACAO_03_ABRIL.pdf',note:'Pagamento da 1.ª prestação do plano',code:'GDP-20260403-002'},
      {date:'2026-05-04',amount:1000000,installment:2,bank:'BPC',ref:'28409484',fileName:'3_PRESTACAO_04_MAIO.pdf',note:'Pagamento da 2.ª prestação do plano',code:'GDP-20260504-003'}
    ]
  };

  let current;
  try{ current=JSON.parse(localStorage.getItem(KEY)||'{}'); }
  catch{ current={}; }

  const isEmpty = !Number(current?.debt?.amount||0) && !(current?.payments?.length) && !(current?.plan?.length);
  if(isEmpty && sessionStorage.getItem(REPAIR_VERSION)!=='done'){
    localStorage.setItem(KEY,JSON.stringify(REAL_STATE));
    sessionStorage.setItem(REPAIR_VERSION,'done');
    location.reload();
  }
})();
