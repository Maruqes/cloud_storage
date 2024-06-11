const fs = require('fs');
const os = require("os");
const crypto = require("crypto")
const db = require('./db.js')
const print = require("./extras.js")
const api = require('./api_connect.js');
const { FILE } = require('dns');

const userHomeDir = os.homedir()

async function upload_db_file()
{
    const res = await api.upload_file(userHomeDir + "/cloud_storage/.cloud_storage.db", "/.cloud_storage_temp.db");

    if (res == -1)
    {
        print.error("Error uploading db file");
        return;
    }
    print.okay("Uploaded db file");
}

async function download_db_file()
{
    const res = await api.download_file("/.cloud_storage_temp.db");

    if (res == -1)
    {
        print.error("Error downloading db file");
        return -1;
    }

    return 0;
}

async function check_db_file_on_drive()
{
    const res = await download_db_file();

    if (res == -1)
    {
        print.error("Error getting db file");
        return;
    }

    print.okay("Got db file");

    db.print_db_file();
}

async function modify_file(file_path, file_hash)
{
    //uplad file to server
    //if successfull update the hash in the db
    //if not successfull return error

    const file_path_after_cloud_folder = file_path.replace(userHomeDir + "/cloud_storage", "");

    const res = await api.upload_file(file_path, file_path_after_cloud_folder);

    if (res == -1)
    {
        print.error("Error uploading file");
        return;
    }

    await db.update_file(file_path, file_hash)
    await db.update_sync_db();
    print.okay(`Updated file on cloud: ${file_path}`);
}

async function delete_file(file_path)
{
    //delete file from server
    //if successfull delete the file from the db
    //if not successfull return error

    const file_path_after_cloud_folder = file_path.replace(userHomeDir + "/cloud_storage", "");

    const res = await api.delete_file(file_path_after_cloud_folder);

    if (res == -1)
    {
        print.error("Error deleting file");
        return;
    }

    await db.delete_file(file_path)
    await db.update_sync_db();
    print.okay(`Deleted file on cloud: ${file_path}`);
}

async function insert_file(file_path, file_hash)
{
    //uplad file to server
    //if successfull insert the file in the db
    //if not successfull return error

    const file_path_after_cloud_folder = file_path.replace(userHomeDir + "/cloud_storage", "");

    const res = await api.upload_file(file_path, file_path_after_cloud_folder);
    if (res == -1)
    {
        print.error("Error uploading file");
        return;
    }

    await db.insert_file(file_path, file_hash)
    await db.update_sync_db();
    print.okay(`Inserted file on cloud: ${file_path}`);
}

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

async function compare_folder_to_db_delete_files(db_files)
{

    for (let i = 0; i < db_files.length; i++)
    {
        const file_db = db_files[i];
        const file_path = file_db.file_path;
        if (!fs.existsSync(file_path))
        {
            delete_file(file_path)
        }
    }
}



async function update_hash_and_add_to_table(file_path, db_files)
{
    const file_buffer = fs.readFileSync(file_path);

    const file_db = db_files.find(file => file.file_path === file_path);

    if (file_db == null)
    {
        const hash = get_file_hash_buf(file_buffer)
        await insert_file(file_path, hash)
    }
    else
    {
        const hash = get_file_hash_buf(file_buffer)
        if (is_file_changed(file_buffer, file_db.file_hash))
        {
            modify_file(file_path, hash)
        }
    }

}

async function compare_folder_to_db_files(dir_path, folder, db)
{

    folder.forEach(file =>
    {
        const filePath = `${dir_path}/${file}`;
        const stats = fs.statSync(filePath);
        if (stats.isFile())
        {
            if (!filePath.includes(".cloud_storage"))
                update_hash_and_add_to_table(filePath, db);
        } else if (stats.isDirectory())
        {
            if (!filePath.includes("."))
            {
                folder = fs.readdirSync(filePath);
                compare_folder_to_db_files(filePath, folder, db)
            }
        }
    });

}


async function get_all_hashes(dir_path)
{
    //get all files in the folder and subfolders
    const files_and_folders = fs.readdirSync(dir_path);
    const db_files = await db.get_all_files();

    compare_folder_to_db_files(dir_path, files_and_folders, db_files)
    compare_folder_to_db_delete_files(db_files);
}



function check_changes()
{
    setInterval(() =>
    {
        get_all_hashes(userHomeDir + "/cloud_storage")
    }, 1000)
}

async function testes()
{
    console.log("starting")

    await db.create_table();
    check_changes();

    // upload_db_file();
    // await check_db_file_on_drive();
}


module.exports = {
    testes
}