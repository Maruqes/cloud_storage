const fs = require('fs');
const { url } = require('inspector');
const file_saver = require('./file_saver.js');


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

async function call_api_graph(input)
{
    const url = "https://graph.microsoft.com/v1.0" + input;

    return await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data =>
        {
            return data;
        })
        .catch((error) =>
        {
            console.error('Error:', error);
            return -1;
        });
}


async function get_new_token_with_refresh_token(settings)
{
    console.log("\n\nREFRESHING TOKEN\n\n")
    const host = "https://login.microsoftonline.com";
    const tenantId = settings.tenantId;
    const clientId = settings.clientId;
    const clientSecret = settings.clientSecret;
    const scope = "https://graph.microsoft.com/.default";
    const grantType = "refresh_token";

    const url = `${host}/${tenantId}/oauth2/v2.0/token`;
    const body = `client_id=${clientId}&scope=${scope}&refresh_token=${refresh_token}&grant_type=${grantType}&client_secret=${clientSecret}`;

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

    let res = await call_api_graph('/me');
    if (res.error !== undefined)
    {
        console.log("Error: " + res.error.message);
        return res.error;
    } else
    {
        file_saver.save_tokens_on_file(token, refresh_token);
        console.log("Logged in");
        console.log(res);
        return 0;
    }
}


async function api_login(settings)
{
    let file_tokens = file_saver.get_tokens_from_file();

    if (file_tokens !== undefined)
    {
        token = file_tokens.token;
        refresh_token = file_tokens.refresh_token;
        let res = await call_api_graph('/me');
        if (res.error !== undefined)
        {
            console.log("Error: " + res.error.message);
        } else
        {
            console.log("Logged in");
            console.log(res);
            return 0;
        }
    }


    if (await get_new_token_with_refresh_token(settings) === 0)
    {
        return 0;
    }

    let url_fetch = file_saver.construct_url(settings);
    let response = await fetch(url_fetch, {
        method: 'GET',
    });
    console.log("\n\n\nOPEN THIS URL IN YOUR BROWSER: " + response.url)
    return 0;
}



function upload_file(file_path, file_name)
{
    const url = "https://graph.microsoft.com/v1.0/me/drive/root:/cloud_storage" + file_name + ":/content";

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

function download_file(file_name)
{
    const url = "https://graph.microsoft.com/v1.0/me/drive/root:/cloud_storage" + file_name + ":/content";

    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    })
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


async function get_tokens(settings) //ask login on link
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

    file_saver.save_tokens_on_file(token, refresh_token);

    return data;
}

module.exports = {
    api_login,
    call_api_graph,
    set_code,
    get_code,
    get_tokens,
    upload_file,
    download_file,
};