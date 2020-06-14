// Requires
const admin = require('firebase-admin');
const express = require('express');
var moment = require('moment');

const negocio = express();
const db = admin.firestore();
const negocioRef = db.collection('negocios');
const workerRef = db.collection('workers');
const investorRef = db.collection('inversionistas');

// Funciones
function cerrarNegocio (idnegocio, idworker) {
  negocioRef.doc(idnegocio).update({
    estado: 'pagado'
  });
  negocioRef.doc(idnegocio).collection('inversionistas').get().then(ref => {
    ref.forEach(doc => {
      negocioRef.doc(idnegocio).collection('inversionistas').doc(doc.id).update({
        estado: 'pagado'
      });
    });
  });
  workerRef.doc(idworker).collection('negocios').doc(idnegocio).update({
    estado: 'pagado'
  });
}

function actualizarWorker (idworker, idnegocio, aporte, interes) {
  workerRef.doc(idworker).collection('negocios').doc(idnegocio).get().then(ref => {
    const dataWorker = ref.data();
    if (dataWorker.cuotasFaltantes - 1 === 0) {
      cerrarNegocio(idnegocio, idworker);
    }
    const vrPagado = aporte + interes;

    workerRef.doc(idworker).collection('negocios').doc(idnegocio).update({
      vrPagado: dataWorker.vrPagado + vrPagado,
      cuotasFaltantes: dataWorker.cuotasFaltantes - 1,
      saldo: dataWorker.saldo - vrPagado
    });
  });
}

function actualizarInversionista (idnegocio, idinversionista, aporte, interes, dataInversionista, idworker) {
  const vrPagado = dataInversionista.vrPagado + ((aporte * dataInversionista.porcAporte) / 100);
  const vrInteres = dataInversionista.ganancia + ((interes * dataInversionista.porcAporte) / 100);
  const vrSaldo = dataInversionista.saldo - ((aporte * dataInversionista.porcAporte) / 100);

  negocioRef.doc(idnegocio).collection('inversionistas').doc(idinversionista).update({
    ganancia: vrInteres,
    vrPagado: vrPagado,
    saldo: vrSaldo
  });
  investorRef.doc(idinversionista).get().then(ref => {
    const dataInvestor = ref.data();
    investorRef.doc(idinversionista).update({
      ganancias: dataInvestor.ganancias + vrInteres,
      recibido: dataInvestor.recibido + vrPagado
    });
  });
  actualizarWorker(idworker, idnegocio, aporte, interes);
}

function actualizarCuota (idnegocio, idcuota) {
  negocioRef.doc(idnegocio).collection('cuotas').doc(idcuota).get().then(ref => {
    const dataCuota = ref.data();

    negocioRef.doc(idnegocio).get().then(negocio => {
      const dataNegocio = negocio.data();

      negocioRef.doc(idnegocio).update({
        vrPagado: dataNegocio.vrPagado + dataCuota.valor,
        saldoPagar: dataNegocio.saldoPagar - dataCuota.valor
      });
      negocioRef.doc(idnegocio).collection('inversionistas').get().then(ref => {
        ref.forEach(doc => {
          const dataInversionista = doc.data();
          actualizarInversionista(idnegocio, doc.id, dataCuota.aporte, dataCuota.interes, dataInversionista, dataNegocio.worker);
        });
      });
    });
  });
  negocioRef.doc(idnegocio).collection('cuotas').doc(idcuota).update({
    estado: 'pagada'
  });
}

function crearcuotas (idnegocio, totalcuotas, valor, fechalimite, intereses, aportes) {
  for (var i = 1; i <= parseInt(totalcuotas); i++) {
    var fechalm = moment(fechalimite, 'DD-MM-YYYY').add(i, 'months').format('DD-MM-YYYY');
    negocioRef.doc(idnegocio).collection('cuotas').doc('cuota' + i).set({
      valor: valor,
      estado: 'pendiente',
      fechapago: fechalm,
      interes: intereses,
      aporte: aportes
    });
  }
}

function asignarnegocio (idnegocio, totalcuotas, valorPagar, monto, idworker) {
  workerRef.doc(idworker).collection('negocios').doc(idnegocio).set({
    cuotasTotales: totalcuotas,
    cuotasFaltantes: totalcuotas,
    estado: 'abierto',
    saldo: valorPagar,
    vrPagado: 0,
    vrPagar: valorPagar,
    vrSolicitado: monto
  });
}

// State negocios
negocio.get('/', (req, res) => {
  res
    .status(200)
    .json({
      ok: true,
      mensaje: 'Negocio ok'
    })
    .end();
});

// Create negocio
negocio.post('/add', async (req, res) => {
  const data = req.body;
  const vrSolicitado = parseInt(data.monto);
  const cuotas = parseInt(data.totalcuotas);
  const interes = 0.02;
  var intcuotas = Math.pow((1 + interes), cuotas);
  var valor = Math.round(vrSolicitado * (((intcuotas) * interes) / (intcuotas - 1)));
  const vrPagar = valor * cuotas;
  const intereses = Math.round((vrPagar - vrSolicitado) / cuotas);
  const aportes = (valor - intereses);
  negocioRef.add({
    aportes: 0,
    descripcion: data.descripcion,
    estado: 'abierto',
    fechalimite: data.fechalimite,
    monto: vrSolicitado,
    titulo: data.titulo,
    totalcuotas: cuotas,
    vrPagar: vrPagar,
    worker: data.worker,
    saldoPagar: vrPagar,
    saldoAportes: vrSolicitado,
    vrPagado: 0
  })
    .then(ref => {
      console.log(ref.id);
      crearcuotas(ref.id, cuotas, valor, data.fechalimite, intereses, aportes);
      asignarnegocio(ref.id, cuotas, vrPagar, vrSolicitado, data.worker);
      res
        .status(201)
        .json({
          ok: true,
          negocio: ref.id,
          mensaje: 'Negocio Creado'
        });
    });
});

// Realizar Pago a Negocio
negocio.post('/pago', async (req, res) => {
  const data = req.body;
  actualizarCuota(data.idnegocio, data.idcuota);
  res
    .status(200)
    .json({
      ok: true,
      data: 'Pago Realizado'
    });
});

// Consultar Negocios Abiertos
negocio.get('/abiertos/', async (req, res) => {
  negocioRef.where('estado', '==', 'abierto').get().then(ref => {
    const datanegocios = [];
    ref.forEach(doc => {
      datanegocios.push({
        id: doc.id,
        data: doc.data()
      });
    });
    res
      .status(201)
      .json({
        ok: true,
        data: datanegocios
      });
  });
});

// Consultar cuotas por Negocio (REVISAR!!!)
negocio.get('/cuotas/:idnegocio', async (req, res) => {
  const idnegocio = req.params.idnegocio;
  negocioRef.doc(idnegocio).collection('cuotas').get().then(cuota => {
    const datacuotas = [];
    cuota.forEach(doc => {
      datacuotas.push({
        id: doc.id,
        data: doc.data()
      });
    });
    res.status(200)
      .json(datacuotas);
  });
});

// Consultar inversionistas por negocio
negocio.get('/inversionista/:idnegocio', async (req, res) => {
  const idnegocio = req.params.idnegocio;
  negocioRef.doc(idnegocio).collection('inversionistas').get().then(inversionista => {
    const datainversionistas = [];
    inversionista.forEach(doc => {
      datainversionistas.push({
        id: doc.id,
        data: doc.data()
      });
    });
    res.status(200)
      .json(datainversionistas);
  });
});

// export
module.exports = negocio;
