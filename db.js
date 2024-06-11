const sqlite3 = require('sqlite3').verbose();
const os = require("os");
const print = require("./extras.js")


const userHomeDir = os.homedir();

const db = new sqlite3.Database(userHomeDir + "/cloud_storage/.cloud_storage.db");


async function create_table()
{
    await db.run("CREATE TABLE IF NOT EXISTS files (file_path TEXT PRIMARY KEY, file_hash TEXT)");
    await db.run("CREATE TABLE IF NOT EXISTS last_sync (id INTEGER PRIMARY KEY AUTOINCREMENT, last_sync TEXT)")
    print.okay("Created table files");
}

async function insert_file(file_path, file_hash)
{
    await db.run(`INSERT INTO files (file_path, file_hash) VALUES ("${file_path}", "${file_hash}")`);
    print.okay(`Inserted file: ${file_path}`);
}

async function update_file(file_path, file_hash)
{
    await db.run(`UPDATE files SET file_hash = "${file_hash}" WHERE file_path = "${file_path}"`);
    print.okay(`Updated file: ${file_path}`);
}

async function delete_file(file_path)
{
    await db.run(`DELETE FROM files WHERE file_path = "${file_path}"`);
    print.okay(`Deleted file: ${file_path}`);
}

async function get_all_files()
{
    print.info("Getting all files from database");
    return new Promise((resolve, reject) =>
    {
        db.all("SELECT * FROM files", (err, rows) =>
        {
            if (err)
            {
                reject(err);
            }
            resolve(rows);
        });
    });
}

async function get_file(file_path)
{
    return new Promise((resolve, reject) =>
    {
        db.get(`SELECT * FROM files WHERE file_path = "${file_path}"`, (err, row) =>
        {
            if (err)
            {
                reject(err);
            }
            resolve(row);
        });
    });
}


async function update_sync_db()
{
    const date = new Date();
    const date_str = date.toISOString();
    await db.run(`INSERT INTO last_sync (last_sync) VALUES ("${date_str}")`);
    print.okay(`Updated last sync: ${date_str}`)
}


async function get_last_sync()
{
    return new Promise((resolve, reject) =>
    {
        db.get(`SELECT * FROM last_sync ORDER BY id DESC LIMIT 1`, (err, row) =>
        {
            if (err)
            {
                reject(err);
            }
            resolve(row);
        });
    });
}








async function open_db_file()
{
    return new sqlite3.Database(userHomeDir + "/cloud_storage/.cloud_storage_temp.db");
}

async function print_db_file()
{
    const db = await open_db_file();
    db.all("SELECT * FROM last_sync ORDER BY id DESC LIMIT 1", (err, rows) =>
    {
        if (err)
        {
            console.log(err);
        }
        console.log(rows);
    });
    db.close();
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
    print_db_file,
};