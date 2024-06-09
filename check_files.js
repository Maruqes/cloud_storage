const fs = require('fs');
const os = require("os");
const crypto = require("crypto")
const db = require('./db.js')
const print = require("./extras.js")


const userHomeDir = os.homedir()

function get_file_hash_path(file_path)
{
    const file_buffer = fs.readFileSync(file_path);
    const hash = crypto.createHash('sha256');
    hash.update(file_buffer);
    return hash.digest('hex');
}

function get_file_hash_buf(buf)
{
    const hash = crypto.createHash('sha256');
    hash.update(buf);
    return hash.digest('hex');
}

function is_file_changed(file_buffer1, file_hash)
{

    //create an hash of the file
    let hash1 = get_file_hash_buf(file_buffer1)

    if (hash1 !== file_hash)
    {
        return true;
    }
    return false;
}

async function compare_folder_to_db_delete_files()
{
    const files = await db.get_all_files();

    files.forEach(file =>
    {
        if (!fs.existsSync(file.file_path))
        {
            db.delete_file(file.file_path)
        }
    });
}



async function update_hash_and_add_to_table(file_path)
{
    const file_buffer = fs.readFileSync(file_path);

    const file_db = await db.get_file(file_path)
    if (file_db == null)
    {
        const hash = get_file_hash_buf(file_buffer)
        db.insert_file(file_path, hash)
    }
    else
    {
        const hash = get_file_hash_buf(file_buffer)
        if (is_file_changed(file_buffer, file_db.file_hash))
        {
            db.update_file(file_path, hash)
        }
    }
}


async function get_all_hashes(dir_path)
{
    //get all files in the folder and subfolders
    const files_and_folders = fs.readdirSync(dir_path);

    await files_and_folders.forEach(file =>
    {
        const filePath = `${dir_path}/${file}`;
        const stats = fs.statSync(filePath);
        if (stats.isFile())
        {
            if (!filePath.includes(".cloud_storage"))
                update_hash_and_add_to_table(filePath);
        } else if (stats.isDirectory())
        {
            if (!filePath.includes("."))
            {
                get_all_hashes(filePath)
            }
        }
    });

    compare_folder_to_db_delete_files();
}



async function testes()
{
    await get_all_hashes(userHomeDir + "/cloud_storage")
}


module.exports = {
    is_file_changed,
    testes
}