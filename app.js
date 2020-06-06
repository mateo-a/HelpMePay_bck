// Requires
const express = require('express');
const admin = require('firebase-admin');

//Initializ variables
const app = express();
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

//Route
app.get('/', (req, res) => {
    res
        .status(200)
        .json({
	    ok: true,
	    mensaje: 'Peticion ok'
	})
        .end();
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log('Express server: \x1b[32m%s\x1b[0m','online');
})
