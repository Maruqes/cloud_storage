const fs = require('fs');
const os = require("os");
const crypto = require("crypto")
const db = require('./db.js')
const print = require("./extras.js")
const api = require('./api_connect.js');
const { FILE } = require('dns');
const { get } = require('http');

const userHomeDir = os.homedir()

async function modify_file(file_path, file_hash)
{
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
    const file_path_after_cloud_folder = file_path.replace(userHomeDir + "/cloud_storage", "");

    const res = await api.upload_file(file_path, file_path_after_cloud_folder);
    if (res == -1)
    {
        print.error("Error uploading file");
        return;
    }


    try
    {
        await db.insert_file(file_path, file_hash);
        await db.update_sync_db();
        print.okay(`Inserted file on cloud: ${file_path}`);
    }
    catch (error)
    {
        //check if error SQLITE_CONSTRAINT: UNIQUE constraint failed: files.file_path

        if (error.message.includes("UNIQUE constraint failed: files.file_path"))
        {
            print.error("File already exists on db file: " + file_path);
            return;
        }
    }
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
            await delete_file(file_path)
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
            await modify_file(file_path, hash)
        }
    }

}

async function compare_folder_to_db_files(dir_path, folder, db)
{

    folder.forEach(async file => 
    {
        const filePath = `${dir_path}/${file}`;
        if (filePath.includes(".cloud_storage"))
            return;
        if (filePath.includes(".cloud_storage.db-journal"))
            return;
        const stats = fs.statSync(filePath);
        if (stats.isFile())
        {
            await update_hash_and_add_to_table(filePath, db);
        } else if (stats.isDirectory())
        {
            if (!filePath.includes("."))
            {
                folder = fs.readdirSync(filePath);
                await compare_folder_to_db_files(filePath, folder, db)
            }
        }
    });

}


async function get_all_hashes(dir_path)
{
    print.info("Getting all hashes");
    //get all files in the folder and subfolders
    const files_and_folders = fs.readdirSync(dir_path);
    const db_files = await db.get_all_files();

    await compare_folder_to_db_files(dir_path, files_and_folders, db_files)
    await compare_folder_to_db_delete_files(db_files);
}



async function check_changes()
{
    setInterval(() =>
    {
        get_all_hashes(userHomeDir + "/cloud_storage")
    }, 1000);
}

async function testes()
{
    console.log("starting")

    await db.create_table();
    check_changes();

}


module.exports = {
    testes
}