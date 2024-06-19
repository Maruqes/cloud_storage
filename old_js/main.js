const api = require('./api_connect.js');
const express = require('express');
const fs = require('fs');
const secrets = require('./secrets.json');
const os = require("os");
const check_files = require('./check_files.js');
const print = require("./extras.js")

const settings = {
    'clientId': secrets.clientId,
    'tenantId': secrets.tenantId,
    'clientSecret': secrets.clientSecret,
    'graphUserScopes': secrets.user_scopes,
    'graphUserScopes_arr': secrets.user_scopes_arr
};

const userHomeDir = os.homedir()



function create_if_not_exists_main_folder() {

    const folderPath = userHomeDir + "/cloud_storage"; // Replace with the actual folder path
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
}

async function start_aa() {
    console.log("starting");
    await api.api_login(settings);
    await check_files.testes();

    // api.download_file("/gameJOKER/user/user.c");
    // api.get_all_files("");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
    //read ?code from url
    const code = req.query.code;
    api.set_code(code);
    console.log(api.get_code());

    await api.get_tokens(settings);

    res.sendStatus(200);
});


app.listen(8080, () => {
    console.log('Server is running on port 3000');
    create_if_not_exists_main_folder();
    start_aa();
});
