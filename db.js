const sqlite3 = require('sqlite3').verbose();
const os = require("os");
const print = require("./extras.js")


const userHomeDir = os.homedir();

const db = new sqlite3.Database(userHomeDir + "/cloud_storage/.cloud_storage.db");


db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS files (file_path TEXT, file_hash TEXT)");
    print.okay("Database created");
});

function insert_file(file_path, file_hash) {
    db.run(`INSERT INTO files (file_path, file_hash) VALUES ("${file_path}", "${file_hash}")`);
    print.okay(`Inserted file: ${file_path}`);
}

function update_file(file_path, file_hash) {
    db.run(`UPDATE files SET file_hash = "${file_hash}" WHERE file_path = "${file_path}"`);
    print.okay(`Updated file: ${file_path}`);
}

function delete_file(file_path) {
    db.run(`DELETE FROM files WHERE file_path = "${file_path}"`);
    print.okay(`Deleted file: ${file_path}`);
}

function get_all_files() {
    print.info("Getting all files from database");
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM files", (err, rows) => {
            if (err) {
                reject(err);
            }
            resolve(rows);
        });
    });
}

module.exports = {
    insert_file,
    update_file,
    delete_file,
    get_all_files
};