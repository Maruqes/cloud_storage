package main

import (
	"database/sql"
	"strings"
)

func create_sqlite_db_and_tables() (okay int, err error) {
	// create a new database
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage.db")
	if err != nil {
		fail("Error creating database:" + err.Error())
		return -1, err
	}
	defer db.Close()
	// create the tables
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS files (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		file_path TEXT,
		file_hash TEXT
	);`)
	if err != nil {
		fail("Error creating table:", err)
		return -1, err
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS last_sync (
	id INTEGER PRIMARY KEY AUTOINCREMENT, 
	last_sync TEXT);`)
	if err != nil {
		fail("Error creating table:" + err.Error())
		return -1, err
	}

	return 0, nil
}

func upload_file_to_database(file_path string, file_hash string) {
	//upload file_path file_hash to db if it doesn't exist already or update it if it does
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}
	defer db.Close()

	file_path = strings.Replace(file_path, MAIN_PATH, "", 1)
	rows, err := db.Query("SELECT file_path FROM files WHERE file_path = ?;", file_path)
	if err != nil {
		fail("Error selecting from database:" + err.Error())
	}
	defer rows.Close()

	var path string
	for rows.Next() {
		err = rows.Scan(&path)
		if err != nil {
			fail("Error scanning from database:" + err.Error())
		}
	}

	if path == "" {
		_, err = db.Exec("INSERT INTO files (file_path, file_hash) VALUES (?, ?);", file_path, file_hash)
		if err != nil {
			fail("Error inserting into database:" + err.Error())
		}
	} else {
		_, err = db.Exec("UPDATE files SET file_hash = ? WHERE file_path = ?;", file_hash, file_path)
		if err != nil {
			fail("Error updating database:" + err.Error())
		}
	}
}

func delete_file_in_database(file_path string) {
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}
	defer db.Close()

	file_path = strings.Replace(file_path, MAIN_PATH, "", 1)
	_, err = db.Exec("DELETE FROM files WHERE file_path = ?;", file_path)
	if err != nil {
		fail("Error deleting from database:" + err.Error())
	}
}

func update_last_sync() {
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}

	// only save last 50 syncs
	_, err = db.Exec("DELETE FROM last_sync WHERE id NOT IN (SELECT id FROM last_sync ORDER BY id DESC LIMIT 50);")
	if err != nil {
		fail("Error deleting from database:" + err.Error())
	}

	// insert current timestamp with milliseconds
	_, err = db.Exec("INSERT INTO last_sync (last_sync) VALUES (strftime('%Y-%m-%d %H:%M:%f', 'now'));")
	if err != nil {
		fail("Error inserting into database:" + err.Error())
	}
	db.Close()
}

func set_last_sync(last_sync string) {
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}

	// only save last 50 syncs
	_, err = db.Exec("DELETE FROM last_sync WHERE id NOT IN (SELECT id FROM last_sync ORDER BY id DESC LIMIT 50);")
	if err != nil {
		fail("Error deleting from database:" + err.Error())
	}

	_, err = db.Exec("INSERT INTO last_sync (last_sync) VALUES (?);", last_sync)
	if err != nil {
		fail("Error inserting into database:" + err.Error())
	}
	db.Close()
}

func get_last_sync() string {
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}
	defer db.Close()

	rows, err := db.Query("SELECT last_sync FROM last_sync ORDER BY id DESC LIMIT 1;")
	if err != nil {
		fail("Error selecting from database:" + err.Error())
	}
	defer rows.Close()

	var last_sync string
	for rows.Next() {
		err = rows.Scan(&last_sync)
		if err != nil {
			fail("Error scanning from database:" + err.Error())
		}
	}

	return last_sync
}

func compare_hash_with_database(file_path string, file_hash string) bool {
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}
	defer db.Close()

	file_path = strings.Replace(file_path, MAIN_PATH, "", 1)
	rows, err := db.Query("SELECT file_hash FROM files WHERE file_path = ?;", file_path)
	if err != nil {
		fail("Error selecting from database:" + err.Error())
	}
	defer rows.Close()

	var hash string
	for rows.Next() {
		err = rows.Scan(&hash)
		if err != nil {
			fail("Error scanning from database:" + err.Error())
		}
	}

	return hash == file_hash
}

func get_all_files() (files []string) {
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}
	defer db.Close()

	rows, err := db.Query("SELECT file_path FROM files;")
	if err != nil {
		fail("Error selecting from database:" + err.Error())
	}
	defer rows.Close()

	var file_path string
	for rows.Next() {
		err = rows.Scan(&file_path)
		if err != nil {
			fail("Error scanning from database:" + err.Error())
		}
		files = append(files, file_path)
	}

	return files
}

func open_and_close_db() {
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}

	db.Ping()

	db.Close()
}
