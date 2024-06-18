const fs = require('fs');
const os = require("os");
const crypto = require("crypto");
const db = require('./db.js');
const print = require("./extras.js");
const api = require('./api_connect.js');
const path = require('path');

const userHomeDir = os.homedir();

function get_file_hash_buf(buf) {
    const hash = crypto.createHash('sha256');
    hash.update(buf);
    return hash.digest('hex');
}

async function insert_file(file_path, file_hash) {
    const file_path_after_cloud_folder = file_path.replace(userHomeDir + "/cloud_storage", "");

    const res = await api.upload_file(file_path, file_path_after_cloud_folder);
    if (res === -1) {
        print.error("Error uploading file");
        return;
    }

    try {
        await db.insert_file(file_path, file_hash);
        await db.update_sync_db();
        await upload_db_files_to_cloud();
        print.okay(`Inserted file on cloud: ${file_path}`);
    } catch (error) {
        if (error.message.includes("UNIQUE constraint failed: files.file_path")) {
            print.error("File already exists on db file: " + file_path);
            return;
        }
    }
}

async function update_file(file_path, file_hash) {
    const file_path_after_cloud_folder = file_path.replace(userHomeDir + "/cloud_storage", "");

    const res = await api.upload_file(file_path, file_path_after_cloud_folder);
    if (res === -1) {
        print.error("Error uploading file");
        return;
    }

    await db.update_file(file_path, file_hash);
    await db.update_sync_db();
    await upload_db_files_to_cloud();
    print.okay(`Updated file on cloud: ${file_path}`);
}

async function delete_file(file_path) {
    const file_path_after_cloud_folder = file_path.replace(userHomeDir + "/cloud_storage", "");

    const res = await api.delete_file(file_path_after_cloud_folder);
    if (res === -1) {
        print.error("Error deleting file");
        return;
    }

    await db.delete_file(file_path);
    await db.update_sync_db();
    await upload_db_files_to_cloud();
    print.okay(`Deleted file on cloud: ${file_path}`);
}

async function upload_db_files_to_cloud() {
    console.log("Uploaded db file to cloud");
    const last_sync = await db.get_last_sync();
    console.log(last_sync);
    db.close_db();

    const db_file_path = path.join(userHomeDir, "/cloud_storage/.cloud_storage.db");
    await api.upload_file(db_file_path, "/.cloud_storage_temp.db");

    db.open_db();
}

async function sync_files_with_cloud() {
    print.info("Syncing files with cloud");
    const temp_db = await db.open_temp_db();

    const temp_db_files = await db.get_all_files_temp_db(temp_db);
    const db_files = await db.get_all_files();

    for (const file of temp_db_files) {
        const file_path = file.file_path;
        const file_hash = file.file_hash;

        const file_db = db_files.find(file => file.file_path === file_path);

        if (file_db == null) {
            await insert_file(file_path, file_hash);
        } else if (file_db.file_hash !== file_hash) {
            await update_file(file_path, file_hash);
        }
    }

    for (const file_db of db_files) {
        const file_path = file_db.file_path;

        const file = temp_db_files.find(file => file.file_path === file_path);

        if (file == null) {
            await delete_file(file_path);
        }
    }

    await db.update_sync_db();
}

async function check_changes_from_db_temp_on_cloud() {
    await api.download_file("/.cloud_storage_temp.db");

    const temp_db = await db.open_temp_db();

    if (!temp_db) {
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

    if (!last_sync || !our_last_sync) {
        await sync_files_with_cloud();
        db.close_temp_db(temp_db);
        return;
    }

    if (last_sync[0].last_sync > our_last_sync.last_sync) {
        await sync_files_with_cloud();
    }
    db.close_temp_db(temp_db);
}

async function compare_folder_to_db_files(dir_path, folder, db_files) {
    for (const file of folder) {
        const filePath = path.join(dir_path, file);
        if (filePath.includes(".cloud_storage") || filePath.includes(".cloud_storage.db-journal")) {
            continue;
        }

        try {
            const stats = await fs.promises.stat(filePath);
            if (stats.isFile()) {
                await update_hash_and_add_to_table(filePath, db_files);
            } else if (stats.isDirectory() && !filePath.includes(".")) {
                const subFolder = await fs.promises.readdir(filePath);
                await compare_folder_to_db_files(filePath, subFolder, db_files);
            }
        } catch (error) {
            if (error.code === "ENOENT") {
                await delete_file(filePath);
            }
        }
    }
}

async function update_hash_and_add_to_table(file_path, db_files) {
    const file_buffer = await fs.promises.readFile(file_path);
    const file_db = db_files.find(file => file.file_path === file_path);

    if (!file_db) {
        const hash = get_file_hash_buf(file_buffer);
        await insert_file(file_path, hash);
    } else {
        const hash = get_file_hash_buf(file_buffer);
        if (is_file_changed(file_buffer, file_db.file_hash)) {
            await update_file(file_path, hash);
        }
    }
}

async function compare_folder_to_db_delete_files(db_files) {
    for (const file_db of db_files) {
        const file_path = file_db.file_path;
        if (!fs.existsSync(file_path)) {
            await delete_file(file_path);
        }
    }
}

async function compare_folder_to_db(dir_path) {
    print.info("Comparing folder to db");
    const files_and_folders = await fs.promises.readdir(dir_path);
    const db_files = await db.get_all_files();

    await check_changes_from_db_temp_on_cloud();
    await compare_folder_to_db_files(dir_path, files_and_folders, db_files);
    await compare_folder_to_db_delete_files(db_files);

    print.okay("Finished getting all hashes");

    await new Promise(resolve => setTimeout(resolve, 1000));
    compare_folder_to_db(dir_path);
}

async function testes() {
    console.log("starting");

    await db.create_table();
    await compare_folder_to_db(path.join(userHomeDir, "/cloud_storage"));
}

module.exports = {
    testes
};
