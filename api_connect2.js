const fs = require('fs');
const { url } = require('inspector');

let code = undefined;
let token = undefined;
let refresh_token = undefined;

function set_code(new_code)
{
    code = new_code;
}

function get_code()
{
    return code;
}


function construct_url(settings)
{
    let url = 'https://login.microsoftonline.com/' + settings.tenantId + '/oauth2/v2.0/authorize?';
    url += 'client_id=' + settings.clientId;
    url += '&response_type=code';
    url += '&redirect_uri=http%3A%2F%2Flocalhost%3a8080';
    url += '&response_mode=query';
    url += '&scope=';

    for (let i = 0; i < settings.graphUserScopes_arr.length; i++)
    {
        url += settings.graphUserScopes_arr[i];
        if (i < settings.graphUserScopes_arr.length - 1)
        {
            url += '%20';
        }
    }

    url += '&state=12345';

    return url;
}


async function api_login(settings)
{
    let url_fetch = construct_url(settings);
    let response = await fetch(url_fetch, {
        method: 'GET',
    });
    console.log(response.url)
    return 0;
}


function call_api_graph(input)
{
    const url = "https://graph.microsoft.com/v1.0" + input;

    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data =>
        {
            console.log(data);
        })
        .catch((error) =>
        {
            console.error('Error:', error);
        });

    return 0;
}


function upload_file(file_path, file_name)
{
    const url = "https://graph.microsoft.com/v1.0/me/drive/root:/" + file_name + ":/content";

    fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: fs.readFileSync(file_path)
    })
        .then(response => response.json())
        .then(data =>
        {
            console.log(data);
        })
        .catch((error) =>
        {
            console.error('Error:', error);
        });

    return 0;
}


async function get_tokens(settings)
{
    const host = "https://login.microsoftonline.com";
    const tenantId = settings.tenantId;
    const clientId = settings.clientId;
    const clientSecret = settings.clientSecret;
    const scope = "https://graph.microsoft.com/.default";
    const grantType = "authorization_code";

    const url = `${host}/${tenantId}/oauth2/v2.0/token`;
    const body = `client_id=${clientId}&scope=${scope}&code=${code}&redirect_uri=http://localhost:8080&grant_type=${grantType}&client_secret=${clientSecret}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
    });

    const data = await response.json();
    token = data.access_token;
    refresh_token = data.refresh_token;

    console.log("\n\n\ntoken: " + token + "\n\n\n");
    console.log("\n\n\nrefresh_token: " + refresh_token + "\n\n\n");

    call_api_graph('/me');

    upload_file('test.txt', 'test.txt');

    return data;
}

module.exports = {
    api_login,
    construct_url,
    call_api_graph,
    set_code,
    get_code,
    get_tokens,
};