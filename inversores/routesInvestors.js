//Requires
const admin = require('firebase-admin');
const express = require('express');

const investor = express();
const db = admin.firestore();
const investorRef = db.collection('inversionistas');

//State inversionistas
investor.get('/', (req, res) => {
    res
        .status(200)
        .json({
	    ok: true,
	    mensaje: 'Investor ok'
	})
        .end();
});

//Create Investor
investor.post('/add', async (req, res) => {
    let data = req.body;
    //console.log(req);
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
		})
	});
});

// Cargar capital
investor.post('/capital', async (req, res) => {
    let data = req.body;
    let aporte = 0;

    //console.log(req);
    investorRef.doc(data.id).get().then(ref => {
	let datos = ref.data();
	let iddoc = ref.id;
	aporte = parseInt(datos.capital) + parseInt(data.capital);
	investorRef.doc(data.id).update({
	    capital: aporte
	}).then(ref => {
	    res
		.status(200)
		.json({
		    ok: true,
		    investor: ref.id,
		    mensaje: 'Capital Abonado!'
		})
	});
    });
});

//export
module.exports = investor;
