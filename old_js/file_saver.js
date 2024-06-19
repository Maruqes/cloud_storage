
const fs = require('fs');

function save_tokens_on_file(token, refresh_token)
{
    const data = {
        'token': token,
        'refresh_token': refresh_token
    };

    fs.writeFileSync('tokens.json', JSON.stringify(data));

    console.log("Tokens saved on file")
    return 0;
}

function get_tokens_from_file()
{
    return JSON.parse(fs.readFileSync('tokens.json'));
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


module.exports = {
    save_tokens_on_file,
    get_tokens_from_file,
    construct_url,
};