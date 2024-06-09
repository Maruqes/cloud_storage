const fs = require('fs');
const { url } = require('inspector');
const file_saver = require('./file_saver.js');
const { get } = require('http');
const os = require("os");
const { dir } = require('console');
const check_files = require('./check_files.js');
const print = require("./extras.js")


let code = undefined;
let token = undefined;
let refresh_token = undefined;

const userHomeDir = os.homedir()
const dir_path = userHomeDir + "/cloud_storage";


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



async function download_file(file_name)
{
    const url = "https://graph.microsoft.com/v1.0/me/drive/root:/cloud_storage" + file_name + ":/content";

    let res = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    })
        .then(data =>
        {
            return data;
        })
        .catch((error) =>
        {
            console.error('Error:', error);
            return -1;
        });

    if (res === -1)
        return -1;


    let data = await res.blob();
    let buffer = await data.arrayBuffer();

    //create dir if does not exist
    let split_path = file_name.split("/");

    split_path.pop();
    let temp_path = dir_path;

    for (let i = 0; i < split_path.length; i++)
    {
        if (split_path[i] == "")
            continue;
        temp_path += "/" + split_path[i];
        if (!fs.existsSync(temp_path))
        {
            fs.mkdirSync(temp_path);
        }
    }

    file_name = file_name.replace(dir_path, "");

    try
    {
        let file_buffer_on_pc = fs.readFileSync(dir_path + file_name);

        if (check_files.is_file_changed(file_buffer_on_pc, Buffer.from(buffer)))
        {
            fs.writeFileSync(dir_path + file_name, Buffer.from(buffer));
            console.log("File changed, downloaded at: " + dir_path + file_name + " size of file: " + buffer.byteLength);
        }

    } catch (err)
    {
        if (err.code === 'ENOENT')
        {
            fs.writeFileSync(dir_path + file_name, Buffer.from(buffer));
            console.log("File downloaded at: " + dir_path + file_name + " size of file: " + buffer.byteLength);
        }
    }
    return 0;
}


async function get_all_files(path_to_folder)
{
    const path = "/me/drive/root:/cloud_storage" + path_to_folder + ":/children";

    let res = await fetch("https://graph.microsoft.com/v1.0" + path, {
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

    //if res contains folder print folder
    if (res === -1)
        return -1;
    let files = res.value;
    for (let i = 0; i < files.length; i++)
    {
        if (files[i].folder != undefined)
        {
            console.log("Folder Found: " + files[i].name);
            get_all_files(path_to_folder + "/" + files[i].name);
        } else
        {
            let final_path = path_to_folder + "/" + files[i].name
            download_file(final_path);
        }

    }
}


module.exports = {
    api_login,
    call_api_graph,
    get_tokens,
    upload_file,
    download_file,
    get_all_files,
};