// Requires
const admin = require('firebase-admin');
const express = require('express');

const worker = express();
const db = admin.firestore();
const workerRef = db.collection('workers');

// State workers
worker.get('/', (req, res) => {
  res
    .status(200)
    .json({
      ok: true,
      mensaje: 'Worker ok'
    })
    .end();
});

// Create worker
worker.post('/add', async (req, res) => {
  const data = req.body;
  // console.log(req);
  workerRef.doc(data.id).set({
    nombre: data.nombre,
    cedula: data.cedula,
    apellido: data.apellido,
    imagen: data.imagen
  })
    .then(ref => {
      // console.log(ref);
      res
        .status(201)
        .json({
          ok: true,
          worker: ref.id,
          mensaje: 'Trabajor Creado'
        });
    });
});

// Consultar Datos Trabajador
worker.get('/get/:id', async (req, res) => {
  const idworker = req.params.id;

  workerRef.doc(idworker).get().then( worker => {
    res.status(200)
    .json(worker.data())
  })
});

// Consultar Negocio por Trabajador
worker.get('/negocios/:id', async (req, res) => {
  const idworker = req.params.id;

  workerRef.doc(idworker).collection('negocios').get().then( negocios => {
    let datanegocios = [];
    negocios.forEach(doc => {
      datanegocios.push({
        'id': doc.id,
        'data': doc.data()
      });
    });
    res.status(200)
    .json(datanegocios)
  });
});

// export
module.exports = worker;
