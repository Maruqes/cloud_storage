const api = require('./api_connect.js');
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


function upload_files_recursion(path, folder_exeption_last)
{
    if (folder_exeption_last == null)
    {
        const split_path = path.split("/");
        folder_exeption_last = split_path.slice(0, split_path.length - 1).join("/");
    }

    const files = fs.readdirSync(path);
    files.forEach(file =>
    {
        const filePath = `${path}/${file}`;
        const stats = fs.statSync(filePath);
        if (stats.isFile())
        {
            const sv_file_path = filePath.replace(folder_exeption_last, "");
            api.upload_file(filePath, sv_file_path);
        } else if (stats.isDirectory())
        {
            if (!filePath.includes("."))
                upload_files_recursion(filePath, folder_exeption_last);
        }
    });
}

function upload_files(path)
{
    upload_files_recursion(path, null)
}

const folderPath = '/home/marques/projects/gameJOKER'; // Replace with the actual folder path


async function start_aa()
{
    console.log("starting");
    await api.api_login(settings);
    // upload_files(folderPath, null);
    api.download_file("/gameJOKER/README.md");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) =>
{
    //read ?code from url
    const code = req.query.code;
    api.set_code(code);
    console.log(api.get_code());

    await api.get_tokens(settings);

    res.sendStatus(200);
});


app.listen(8080, () =>
{
    console.log('Server is running on port 3000');
    start_aa();
});

