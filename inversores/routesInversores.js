// Requires
const admin = require('firebase-admin');
const express = require('express');

const investor = express();
const db = admin.firestore();
const investorRef = db.collection('inversionistas');
const negocioRef = db.collection('negocios');
const workerRef = db.collection('workers');

// Funciones
function crearnegocio(idinversionista, idnegocio) {
  investorRef.doc(idinversionista).collection('negocios').doc(idnegocio).set({
  });
}

function agregarInversionista(idinversionista, idnegocio, aporte, porcentaje, estado) {
  negocioRef.doc(idnegocio).collection('inversionistas').doc(idinversionista).set({
    aporte: aporte,
    estado: estado,
    ganancia: 0,
    vrPagado: 0,
    saldo: aporte,
    porcAporte: porcentaje
  });
}

function actualizarBalance(idinversionista, aporte) {
  investorRef.doc(idinversionista).get().then(ref => {
    const datos = ref.data();
    let aportes = datos.aportes + aporte;
    let contribucion = datos.contribucion - aporte ;
    
    investorRef.doc(idinversionista).update({
      aportes: aportes,
      contribucion: contribucion
    });
  });
}

function activarPrestamo (idnegocio) {
  negocioRef.doc(idnegocio).update({
    estado: 'prestamo'
  });

  negocioRef.doc(idnegocio).get().then(ref => {
    const datos = ref.data();
        workerRef.doc(datos.worker).collection('negocios').doc(idnegocio).update({
        estado: 'prestamo'
      })
  });

  negocioRef.doc(idnegocio).collection('inversionistas').where('estado', '==', 'abierto').get().then(ref => {
    ref.forEach(doc => {
      actualizarBalance(doc.id, doc.data().aporte);
      negocioRef.doc(idnegocio).collection('inversionistas').doc(doc.id).update({
        estado: 'prestamo'
      });
      
      const datos = doc.data();

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
      console.log(ref);
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

  investorRef.doc(data.idinversionista).get().then(ref => {
    const datos = ref.data();
    var aporte = parseInt(data.aporte);
    var aportesInv = parseInt(datos.aportes);
    var capitalInv = parseInt(datos.capital);
    var estadoNegocio = 'abierto';

    negocioRef.doc(data.idnegocio).get().then(negocio => {
      const datosNegocio = negocio.data();
      var aportesNeg = parseInt(datosNegocio.aportes);
      var saldoAporte = parseInt(datosNegocio.saldoAportes);
      if (aporte < saldoAporte) {
        saldoAporte -= aporte;
        aportesInv += aporte;
        capitalInv -= aporte;
      } else if (aporte === saldoAporte) {
        saldoAporte = 0;
        aportesInv += aporte;
        capitalInv -= aporte;
        activarPrestamo(data.idnegocio);
      } else {
        capitalInv -= saldoAporte;
        aportesInv += saldoAporte;
        saldoAporte = 0;
        activarPrestamo(data.idnegocio);
      }
      negocioRef.doc(data.idnegocio).update({
        aportes: aportesNeg + aportesInv,
        saldoAportes: saldoAporte
      });
      const vrSolicitado = parseInt(datosNegocio.monto);
      const porcentaje = (aportesInv * 100) / vrSolicitado;
      const contribucion = parseInt(datos.contribucion) + parseInt(aportesInv);
      agregarInversionista(data.idinversionista, data.idnegocio, aportesInv, porcentaje, estadoNegocio);
      crearnegocio(data.idinversionista, data.idnegocio);
      investorRef.doc(data.idinversionista).update({
        capital: capitalInv,
        contribucion: contribucion
      }).then(ref => {
        res
          .status(200)
          .json({
            ok: true,
            mensaje: 'Aporte Realizado!'
          });
      });
    });
  });
});

// Consultar Inversionista
investor.get('/get/:id', async (req, res) => {
  const idinversionista = req.params.id;

  investorRef.doc(idinversionista).get().then( inversionista => {
    res.status(200)
    .json(inversionista.data())
  })
});

// Consultar Negocios del Inversionista
investor.get('/negocios/:id', async (req, res) => {
  const idinversionista = req.params.id;

  investorRef.doc(idinversionista).collection('negocios').get().then( negocios => {
    let datanegocios = [];
    negocios.forEach(doc => {
      datanegocios.push({
        'id': doc.id,
      });
    });
    res.status(200)
    .json(datanegocios)
  });
});

// export
module.exports = investor;
