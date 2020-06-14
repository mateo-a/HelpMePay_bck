// Requires
const admin = require('firebase-admin');
const express = require('express');

const investor = express();
const db = admin.firestore();
const investorRef = db.collection('inversionistas');
const negocioRef = db.collection('negocios');
const workerRef = db.collection('workers');

function agregarInversionista (idinversionista, idnegocio, porcentaje, estado, aporte) {
  negocioRef.doc(idnegocio).collection('inversionistas').doc(idinversionista).get().then(inversor => {
    const datos = inversor.data();
    if (!inversor.exists) {
      investorRef.doc(idinversionista).collection('negocios').doc(idnegocio).set({
      });
      negocioRef.doc(idnegocio).collection('inversionistas').doc(idinversionista).set({
        aporte: aporte,
        estado: estado,
        ganancia: 0,
        vrPagado: 0,
        saldo: aporte,
        porcAporte: porcentaje
      });
    } else {
      negocioRef.doc(idnegocio).collection('inversionistas').doc(idinversionista).update({
        aporte: datos.aporte + aporte,
        estado: estado,
        ganancia: 0,
        vrPagado: 0,
        saldo: datos.saldo + aporte,
        porcAporte: porcentaje + datos.porcAporte
      });
    }
  });
}

function actualizarBalance (idinversionista, idnegocio) {
  negocioRef.doc(idnegocio).collection('inversionistas').doc(idinversionista).get().then(investor => {
    const datosInv = investor.data();
    investorRef.doc(idinversionista).get().then(ref => {
      console.log('Actualizar Balance para: ', idinversionista);
      const datos = ref.data();
      const aportes = datos.aportes + datosInv.aporte;
      const contribucion = datos.contribucion - datosInv.aporte;
      investorRef.doc(idinversionista).update({
        aportes: aportes,
        contribucion: contribucion
      });
    });
  });
}

function activarPrestamo (idnegocio, idinversionista) {
  negocioRef.doc(idnegocio).update({
    estado: 'prestamo'
  });

  negocioRef.doc(idnegocio).get().then(datosNegocio => {
    const datosNeg = datosNegocio.data();
    workerRef.doc(datosNeg.worker).collection('negocios').doc(idnegocio).update({
      estado: 'prestamo'
    });
  });
  // negocioRef.doc(idnegocio).collection('inversionistas').where('estado', '==', 'abierto').get().then(ref => {
  negocioRef.doc(idnegocio).collection('inversionistas').get().then(querySnapshot => {
    negocioRef.doc(idnegocio).collection('inversionistas').get().then(ref => {
      ref.forEach(doc => {
        console.log('Id Inversionista para actualizar: ', doc.id);
        actualizarBalance(doc.id, idnegocio);
        negocioRef.doc(idnegocio).collection('inversionistas').doc(doc.id).update({
          estado: 'prestamo'
        });
      });
    });
  });
}

// State inversionistas
investor.get('/', (req, res) => {
  res
    .status(200)
    .json({
      ok: true,
      mensaje: 'Investor ok'
    })
    .end();
});

// Crear Inversionista
investor.post('/add', async (req, res) => {
  const data = req.body;

  investorRef.doc(data.id).set({
    nombre: data.nombre,
    cedula: data.cedula,
    apellido: data.apellido,
    imagen: data.imagen,
    capital: 0,
    aportes: 0,
    contribucion: 0,
    ganancias: 0,
    recibido: 0
  })
    .then(ref => {
      res
        .status(201)
        .json({
          ok: true,
          investor: ref.id,
          mensaje: 'Inversionista Creado'
        });
    });
});

// Cargar capital
investor.post('/capital', async (req, res) => {
  const data = req.body;
  let capital = 0;

  investorRef.doc(data.id).get().then(ref => {
    const datos = ref.data();
    capital = parseInt(datos.capital) + parseInt(data.capital);
    investorRef.doc(data.id).update({
      capital: capital
    }).then(ref => {
      res
        .status(200)
        .json({
          ok: true,
          investor: ref.id,
          mensaje: 'Capital Abonado!'
        });
    });
  });
});

// Aportar a negocio
investor.post('/aportar', async (req, res) => {
  const data = req.body;
  console.log(data.idinversionista);

  investorRef.doc(data.idinversionista).get().then(inversor => {
    const datos = inversor.data();
    var aporte = parseInt(data.aporte);
    var capitalInv = parseInt(datos.capital);
    var estadoNegocio = 'abierto';

    negocioRef.doc(data.idnegocio).get().then(negocio => {
      const datosNegocio = negocio.data();
      var aportesNeg = parseInt(datosNegocio.aportes);
      var saldoAporte = parseInt(datosNegocio.saldoAportes);
      var acPrestamo = 0;
      if (datosNegocio.estado === 'abierto') {
        if (aporte < saldoAporte) {
          saldoAporte -= aporte;
          capitalInv -= aporte;
        } else if (aporte === saldoAporte) {
          saldoAporte = 0;
          capitalInv -= aporte;
          acPrestamo = 1;
        } else {
          aporte = saldoAporte;
          capitalInv -= aporte;
          saldoAporte = 0;
          console.log('\nCapital Inversionista: ', capitalInv);
          console.log('Saldo Aportes Inversionista: ', saldoAporte);
          acPrestamo = 1;
        }
        negocioRef.doc(data.idnegocio).update({
          aportes: aportesNeg + aporte,
          saldoAportes: saldoAporte
        });
        const vrSolicitado = parseInt(datosNegocio.monto);
        const porcentaje = (aporte * 100) / vrSolicitado;
        const contribucion = parseInt(datos.contribucion) + parseInt(aporte);
        agregarInversionista(data.idinversionista, data.idnegocio, porcentaje, estadoNegocio, aporte);
        investorRef.doc(data.idinversionista).update({
          capital: capitalInv,
          contribucion: contribucion
        });
        if (acPrestamo === 1) {
          activarPrestamo(data.idnegocio, data.idinversionista);
          res
            .status(200)
            .json({
              ok: true,
              mensaje: 'Aporte Realizado y Prestamo Activado!'
            });
        } else {
          res
            .status(200)
            .json({
              ok: true,
              mensaje: 'Aporte Realizado!'
            });
        }
      } else {
        res
          .status(403)
          .json({
            ok: false,
            mensaje: 'Este negocio ya no se encuentra abierto para recibir aportes.'
          });
      }
    });
  });
});

// Consultar Inversionista
investor.get('/get/:id', async (req, res) => {
  const idinversionista = req.params.id;

  investorRef.doc(idinversionista).get().then(inversionista => {
    res.status(200)
      .json(inversionista.data());
  });
});

// Consultar Negocios del Inversionista
investor.get('/negocios/:id', async (req, res) => {
  const idinversionista = req.params.id;

  investorRef.doc(idinversionista).collection('negocios').get().then(negocios => {
    const datanegocios = [];
    negocios.forEach(doc => {
      datanegocios.push({
        id: doc.id
      });
    });
    res.status(200)
      .json(datanegocios);
  });
});

// export
module.exports = investor;
