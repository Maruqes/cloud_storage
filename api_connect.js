const fs = require('fs');

require('isomorphic-fetch');
const azure = require('@azure/identity');
const graph = require('@microsoft/microsoft-graph-client');
const authProviders =
    require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');



let _settings = undefined;
let _deviceCodeCredential = undefined;
let _userClient = undefined;

function initializeGraphForUserAuth(settings, deviceCodePrompt) {
    console.log("Login in...")
    // Ensure settings isn't null
    if (!settings) {
        throw new Error('Settings cannot be undefined');
    }

    _settings = settings;

    _deviceCodeCredential = new azure.DeviceCodeCredential(
        {
            tenantId: settings.tenantId,
            clientId: settings.clientId,
            userCodeInfo: deviceCodePrompt
        }
        // settings.username,
        // settings.password
    );

    const authProvider = new authProviders.TokenCredentialAuthenticationProvider(
        _deviceCodeCredential, {
        scopes: settings.graphUserScopes
    });

    _userClient = graph.Client.initWithMiddleware({
        authProvider: authProvider
    });

}

function initializeGraph(settings) {

    initializeGraphForUserAuth(settings, (info) => {
        // Display the device code message to
        // the user. This tells them
        // where to go to sign in and provides the
        // code to use.
        console.log(info.message);
    });
}

async function getUserTokenAsync() {
    // Ensure credential isn't undefined
    if (!_deviceCodeCredential) {
        throw new Error('Graph has not been initialized for user auth');
    }

    // Ensure scopes isn't undefined
    if (!_settings?.graphUserScopes) {
        throw new Error('Setting "scopes" cannot be undefined');
    }

    // Request token with given scopes
    const response = await _deviceCodeCredential.getToken(_settings?.graphUserScopes);
    return response;
}


async function api(input) {
    if (!_userClient) {
        throw new Error('Graph has not been initialized for user auth');
    }

    return await _userClient.api(input).get();
}

async function graph_api(input, token) {
    const response = await fetch("https://graph.microsoft.com/v1.0" + input, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    return await response.json();
}

async function request_new_token() {
    const host = "https://login.microsoftonline.com"
    const tenantId = _settings.tenantId;
    const clientId = _settings.clientId;
    const clientSecret = _settings.clientSecret;
    const scope = "https://graph.microsoft.com/.default";
    const grantType = "client_credentials";

    const url = `${host}/${tenantId}/oauth2/v2.0/token`;
    const body = `client_id=${clientId}&scope=${scope}&client_secret=${clientSecret}&grant_type=${grantType}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
    });

    return await response.json();
}

async function upload_file(file_path, file_name) {
    // const fileContent = await fs.promises.readFile(file_path, 'utf-8');
    const fileData = fs.readFileSync(file_path);

    const response = await _userClient.api('/me/drive/root:/' + file_name + ':/content')
        .put(fileData);
    console.log(response);
}

async function api_login(settings) {

    initializeGraph(settings);
    temp_token = await getUserTokenAsync();
    console.log(temp_token);
}



module.exports = {
    initializeGraph,
    getUserTokenAsync,
    api_login,
    api,
    upload_file,
    request_new_token,
    graph_api
};