const api = require('./api_connect.js');
const api2 = require('./api_connect2.js');
const express = require('express');
const fs = require('fs');
const secrets = require('./secrets.json');


const settings = {
    'clientId': secrets.clientId,
    'tenantId': secrets.tenantId,
    'clientSecret': secrets.clientSecret,
    'graphUserScopes': secrets.user_scopes,
    'graphUserScopes_arr': secrets.user_scopes_arr
};



async function start_aa()
{
    console.log("starting");
    await api2.api_login(settings);

}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) =>
{
    //read ?code from url
    const code = req.query.code;
    api2.set_code(code);
    console.log(api2.get_code());

    await api2.get_tokens(settings);

    res.sendStatus(200);
});


app.listen(8080, () =>
{
    console.log('Server is running on port 3000');
    start_aa();
});

