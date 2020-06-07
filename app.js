// Requires
const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
//var cors = require('cors');

//Initializ variables
const app = express();
//var corsOptions = {
//    origing: 'https://helpmepay-e3b6e.web.app/',
//    optionsSuccessStatus: 200
//}
//app.use(cors(corsOptions));
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
//    databaseURL: "https://helpmepay-e3b6e.firebaseapp.com/"
});
const db = admin.firestore();

//Body Parser aplicattion/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

// Import Routes
var inversores = require('./inversores/routesInvestors');


//Route
app.use('/api/inversores', inversores);
app.get('/api/', (req, res) => {
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
