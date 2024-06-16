const sqlite3 = require('sqlite3').verbose();
const os = require("os");
const print = require("./extras.js");
const { get } = require('https');


const userHomeDir = os.homedir();

let db = new sqlite3.Database(userHomeDir + "/cloud_storage/.cloud_storage.db");

async function create_table() {
    await db.run("CREATE TABLE IF NOT EXISTS files (file_path TEXT PRIMARY KEY, file_hash TEXT)");
    await db.run("CREATE TABLE IF NOT EXISTS last_sync (id INTEGER PRIMARY KEY AUTOINCREMENT, last_sync TEXT)")
    print.okay("Created table files");
}


async function insert_file(file_path, file_hash) {
    return await new Promise(async (resolve, reject) => {
        db.serialize(async function () {
            await db.run(`INSERT INTO files (file_path, file_hash) VALUES ("${file_path}", "${file_hash}")`, (err) => {
                if (err) {
                    reject(err);
                }
                print.okay(`Inserted file: ${file_path}`);
                resolve();
            });
        });
    })
}

async function update_file(file_path, file_hash) {
    return await new Promise(async (resolve, reject) => {
        db.serialize(async function () {
            await db.run(`UPDATE files SET file_hash = "${file_hash}" WHERE file_path = "${file_path}"`, (err) => {
                if (err) {
                    reject(err);
                }
                print.okay(`Updated file: ${file_path}`);
                resolve();
            });
        })
    });
}

async function delete_file(file_path) {
    db.serialize(async function () {
        return await new Promise(async (resolve, reject) => {
            await db.run(`DELETE FROM files WHERE file_path = "${file_path}"`, (err) => {
                if (err) {
                    reject(err);
                }
                print.okay(`Deleted file: ${file_path}`);
                resolve();
            });
        });
    })
}

async function get_all_files() {
    print.info("Getting all files from database");

    return await new Promise(async (resolve, reject) => {
        db.serialize(async function () {
            await db.all("SELECT * FROM files", (err, rows) => {
                if (err) {
                    reject(err);
                }
                resolve(rows);
            });
        })
    });
}

async function get_file(file_path) {
    return await new Promise(async (resolve, reject) => {
        db.serialize(async function () {
            await db.get(`SELECT * FROM files WHERE file_path = "${file_path}"`, (err, row) => {
                if (err) {
                    reject(err);
                }
                resolve(row);
            });
        });
    });
}


async function update_sync_db() {
    return await new Promise(async (resolve, reject) => {
        const date = new Date();
        db.serialize(async function () {
            await db.run(`INSERT INTO last_sync (last_sync) VALUES ("${date}")`);
            print.okay(`Updated last sync: ${date}`)

            resolve();
        });
    });

}


async function get_last_sync() {
    return await new Promise(async (resolve, reject) => {
        db.serialize(async function () {
            await db.get(`SELECT * FROM last_sync ORDER BY id DESC LIMIT 1`, (err, row) => {
                if (err) {
                    reject(err);
                }
                resolve(row);
            });
        });
    });
}


async function close_db() {
    await db.close();
}

async function open_db() {
    db = await new sqlite3.Database(userHomeDir + "/cloud_storage/.cloud_storage.db");
}


async function open_temp_db() {
    return await new sqlite3.Database(userHomeDir + "/cloud_storage/.cloud_storage_temp.db");
}

async function close_temp_db(db_temp) {
    await db_temp.close();
}

async function get_last_sync_temp_db(db_temp) {
    return await new Promise(async (resolve, reject) => {
        db_temp.serialize(async function () {
            await db_temp.all("SELECT * FROM last_sync ORDER BY id DESC LIMIT 1", (err, rows) => {
                if (err) {
                    reject(err);
                }
                resolve(rows);
            });
        })
    });
}

async function get_all_files_temp_db(db_temp) {
    return await new Promise(async (resolve, reject) => {
        db_temp.serialize(async function () {
            await db_temp.all("SELECT * FROM files", (err, rows) => {
                if (err) {
                    reject(err);
                }
                resolve(rows);
            });
        })
    });
}


module.exports = {
    create_table,
    insert_file,
    update_file,
    delete_file,
    get_all_files,
    get_file,
    update_sync_db,
    get_last_sync,
    close_db,
    open_db,
    open_temp_db,
    close_temp_db,
    get_last_sync_temp_db,
    get_all_files_temp_db,
};