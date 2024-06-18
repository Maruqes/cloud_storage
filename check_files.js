const fs = require('fs');
const os = require("os");
const crypto = require("crypto")
const db = require('./db.js')
const print = require("./extras.js")
const api = require('./api_connect.js');
const { FILE } = require('dns');
const { get } = require('http');
const { connect } = require('http2');

const userHomeDir = os.homedir()


function get_file_hash_buf(buf) {
    const hash = crypto.createHash('sha256');
    hash.update(buf);
    return hash.digest('hex');
}

async function insert_file_on_pc(file_path) {
    //download file from cloud
    const file_path_after_cloud_folder = file_path.replace(userHomeDir + "/cloud_storage", "");
    const res = await api.download_file(file_path_after_cloud_folder);

    if (res == -1) {
        print.error("Error downloading file");
        return;
    }

    let hash;

    while (true) {
        try {
            const file_buffer = fs.readFileSync(file_path);
            hash = get_file_hash_buf(file_buffer);
            break;
        } catch (error) {
            if (error.message.includes("no such file or directory")) {
                print.error("File not found");
                return;
            }
        }
    }

    db.insert_file(file_path, hash);
    print.okay(`Inserted file on pc: ${file_path}`);
}

async function update_file_on_pc(file_path) {
    await insert_file_on_pc(file_path)
    print.okay(`Updated file on pc: ${file_path}`);
}

async function delete_file_on_pc(file_path) {
    try {
        fs.unlinkSync(file_path);
    } catch (error) {
        print.error("Error deleting file");
        return;
    }
    print.okay(`Deleted file on pc: ${file_path}`);
}

async function upload_db_files_to_cloud() {
    console.log("Uploaded db file to cloud");
    const last_sync = await db.get_last_sync();
    console.log(last_sync);
    db.close_db();

    const db_file_path = userHomeDir + "/cloud_storage/.cloud_storage.db";
    await api.upload_file(db_file_path, "/.cloud_storage_temp.db");

    db.open_db();
}

async function sync_files_with_cloud() {
    print.info("Syncing files with cloud");
    const temp_db = await db.open_temp_db();

    const temp_db_files = await db.get_all_files_temp_db(temp_db);
    const db_files = await db.get_all_files();

    //download new files not found in our db/ update files that have changed / delete files that are not in the folder

    for (let i = 0; i < temp_db_files.length; i++) {
        const file = temp_db_files[i];
        const file_path = file.file_path;
        const file_hash = file.file_hash;

        const file_db = db_files.find(file => file.file_path === file_path);

        if (file_db == null) {
            await insert_file_on_pc(file_path, file_hash)
        }
        else {
            if (file_db.file_hash !== file_hash) {
                await update_file_on_pc(file_path, file_hash)
            }
        }
    }
    for (let i = 0; i < db_files.length; i++) {
        const file_db = db_files[i];
        const file_path = file_db.file_path;

        const file = temp_db_files.find(file => file.file_path === file_path);

        if (file == null) {
            await delete_file_on_pc(file_path)
        }
    }

    await db.update_sync_db();
}

async function check_changes_from_db_temp_on_cloud() {
    await api.download_file("/.cloud_storage_temp.db");

    const temp_db = await db.open_temp_db();

    if (temp_db == null || temp_db == undefined) {
        return;
    }

    let last_sync = null;
    try {
        last_sync = await db.get_last_sync_temp_db(temp_db);

    } catch (error) {
        if (error.message.includes("no such table: last_sync")) {
            return;
        }
    }

    const our_last_sync = await db.get_last_sync();

    if (last_sync == null || last_sync == undefined) {
        return;
    }

    if (our_last_sync == null || our_last_sync == undefined) {
        await sync_files_with_cloud();
        db.close_temp_db(temp_db);
        return;
    }

    if (last_sync[0].last_sync > our_last_sync.last_sync) {
        await sync_files_with_cloud();
    }
    db.close_temp_db(temp_db);
}


async function modify_file(file_path, file_hash) {
    const file_path_after_cloud_folder = file_path.replace(userHomeDir + "/cloud_storage", "");

    const res = await api.upload_file(file_path, file_path_after_cloud_folder);

    if (res == -1) {
        print.error("Error uploading file");
        return;
    }

    await db.update_file(file_path, file_hash)
    await db.update_sync_db();
    await upload_db_files_to_cloud();
    print.okay(`Updated file on cloud: ${file_path}`);
}

async function delete_file(file_path) {
    const file_path_after_cloud_folder = file_path.replace(userHomeDir + "/cloud_storage", "");

    const res = await api.delete_file(file_path_after_cloud_folder);

    if (res == -1) {
        print.error("Error deleting file");
        return;
    }

    await db.delete_file(file_path)
    await db.update_sync_db();
    await upload_db_files_to_cloud();
    print.okay(`Deleted file on cloud: ${file_path}`);
}

async function insert_file(file_path, file_hash) {
    const file_path_after_cloud_folder = file_path.replace(userHomeDir + "/cloud_storage", "");

    const res = await api.upload_file(file_path, file_path_after_cloud_folder);
    if (res == -1) {
        print.error("Error uploading file");
        return;
    }

    try {
        await db.insert_file(file_path, file_hash);
        await db.update_sync_db();
        await upload_db_files_to_cloud();
        print.okay(`Inserted file on cloud: ${file_path}`);
    }
    catch (error) {
        //check if error SQLITE_CONSTRAINT: UNIQUE constraint failed: files.file_path

        if (error.message.includes("UNIQUE constraint failed: files.file_path")) {
            print.error("File already exists on db file: " + file_path);
            return;
        }
    }
}



function is_file_changed(file_buffer1, file_hash) {

    //create an hash of the file
    let hash1 = get_file_hash_buf(file_buffer1)

    if (hash1 !== file_hash) {
        return true;
    }
    return false;
}

async function compare_folder_to_db_delete_files(db_files) {
    for (let i = 0; i < db_files.length; i++) {
        const file_db = db_files[i];
        const file_path = file_db.file_path;
        if (!fs.existsSync(file_path)) {
            await delete_file(file_path)
        }
    }
}



async function update_hash_and_add_to_table(file_path, db_files) {
    const file_buffer = fs.readFileSync(file_path);

    const file_db = db_files.find(file => file.file_path === file_path);

    if (file_db == null) {
        const hash = get_file_hash_buf(file_buffer)
        await insert_file(file_path, hash)
    }
    else {
        const hash = get_file_hash_buf(file_buffer)
        if (is_file_changed(file_buffer, file_db.file_hash)) {
            await modify_file(file_path, hash)
        }
    }

}

async function compare_folder_to_db_files(dir_path, folder, db) {
    for (let i = 0; i < folder.length; i++) {
        const file = folder[i];
        const filePath = `${dir_path}/${file}`;
        if (filePath.includes(".cloud_storage"))
            continue;
        if (filePath.includes(".cloud_storage.db-journal"))
            continue;

        let stats;
        try {
            stats = fs.statSync(filePath);
        } catch (error) {
            if (error.message.includes("no such file or directory")) {
                await delete_file(filePath);
            }
            continue;
        }

        if (stats.isFile()) {
            await update_hash_and_add_to_table(filePath, db);
        }
        else if (stats.isDirectory()) {
            if (!filePath.includes(".")) {
                const subFolder = fs.readdirSync(filePath);
                await compare_folder_to_db_files(filePath, subFolder, db);
            }
        }
    }
}

async function get_all_hashes(dir_path) {
    print.info("Getting all hashes");
    const files_and_folders = fs.readdirSync(dir_path);
    const db_files = await db.get_all_files();

    await check_changes_from_db_temp_on_cloud();

    await compare_folder_to_db_files(dir_path, files_and_folders, db_files);
    await compare_folder_to_db_delete_files(db_files);

    print.okay("Finished getting all hashes");

    await new Promise(resolve => setTimeout(resolve, 1000));
    get_all_hashes(dir_path);
}




async function testes() {
    console.log("starting")

    await db.create_table();
    await get_all_hashes(userHomeDir + "/cloud_storage")
}


module.exports = {
    testes
}