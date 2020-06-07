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
    investorRef.doc().set({
	nombre: 'John',
	cedula: 12345,
	apellido: 'Ramirez',
	imagen: 'URL'
    })
    .then(ref => {
        res
	.status(201)
	.json({
	    ok: true,
	    investor: ref.id,
	    mensaje: 'prueba'
	})
    });
});
/*    investorRef.doc(data.id).set({
	cedula: data.cedula,
	nombre: data.nombre,
	apellido: data.apellido,
	imagen: data.imagen
    }).then(ref => {
	    res
	        .status(201)
	        .json({
		    ok: true,
		    investor: ref.id
		})
	}).catch(function(error) {
	    res
	        .status(404)
	        .json({
		    ok: false,
		    mensaje: error.code,
		    errors: {   message: error.message }
		})
	        .end();
	});
});*/

//export
module.exports = investor;
