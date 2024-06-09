const fs = require('fs');
const os = require("os");
const crypto = require("crypto")
const db = require('./db.js')
const print = require("./extras.js")


const userHomeDir = os.homedir()

function get_file_hash_path(file_path) {
    const file_buffer = fs.readFileSync(file_path);
    const hash = crypto.createHash('sha256');
    hash.update(file_buffer);
    return hash.digest('hex');
}

function get_file_hash_buf(buf) {
    const hash = crypto.createHash('sha256');
    hash.update(buf);
    return hash.digest('hex');
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
            db.delete_file(file_path)
        }
    }
}



async function update_hash_and_add_to_table(file_path, db_files) {
    const file_buffer = fs.readFileSync(file_path);

    const file_db = db_files.find(file => file.file_path === file_path);

    if (file_db == null) {
        const hash = get_file_hash_buf(file_buffer)
        db.insert_file(file_path, hash)
    }
    else {
        const hash = get_file_hash_buf(file_buffer)
        if (is_file_changed(file_buffer, file_db.file_hash)) {
            db.update_file(file_path, hash)
        }
    }

}

async function compare_folder_to_db_files(dir_path, folder, db) {

    folder.forEach(file => {
        const filePath = `${dir_path}/${file}`;
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
            if (!filePath.includes(".cloud_storage"))
                update_hash_and_add_to_table(filePath, db);
        } else if (stats.isDirectory()) {
            if (!filePath.includes(".")) {
                folder = fs.readdirSync(filePath);
                compare_folder_to_db_files(filePath, folder, db)
            }
        }
    });

}


async function get_all_hashes(dir_path) {
    //get all files in the folder and subfolders
    const files_and_folders = fs.readdirSync(dir_path);
    const db_files = await db.get_all_files();

    compare_folder_to_db_files(dir_path, files_and_folders, db_files)
    compare_folder_to_db_delete_files(db_files);
}



async function testes() {
    await get_all_hashes(userHomeDir + "/cloud_storage", null)
}


module.exports = {
    is_file_changed,
    testes
}