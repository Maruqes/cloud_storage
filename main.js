const api = require('./api_connect.js');
const express = require('express');
const fs = require('fs');
const secrets = require('./secrets.json');


const settings = {
    'clientId': secrets.clientId,
    'tenantId': secrets.tenantId,
    'clientSecret': secrets.clientSecret,
    'graphUserScopes': secrets.user_scopes
};




async function start_aa() {
    await api.api_login(settings);
    // await api.upload_file('/home/marques/Pictures/Screenshots/Screenshot from 2024-05-29 15-37-18.png', 'test.png');
    console.log("token")
    console.log("token")
    console.log("token")
    console.log("token")
    console.log("token")
    console.log("token")
    console.log("token")
    console.log("token")
    console.log("token")

    new_token = await api.request_new_token();
    console.log(new_token);
    // console.log(await api.graph_api('/me', new_token.access_token));
}


start_aa();

// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// app.get('/', (req, res) => {
//     res.sendFile(__dirname + '/index.html');
// });

// app.get('/login_api', (req, res) => {
//     api.api_login(settings);
// });

// app.get('/test', async (req, res) => {
//     console.log('test');
//     let me = await api.use_user_token_and_get_me();
//     console.log(me)
// });

// app.listen(3000, () => {
//     console.log('Server is running on port 3000');
// });