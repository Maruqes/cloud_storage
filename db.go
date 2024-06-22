package main

import "database/sql"

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
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}
	defer db.Close()

	_, err = db.Exec("INSERT INTO files (file_path, file_hash) VALUES (?, ?);", file_path, file_hash)
	if err != nil {
		fail("Error inserting into database:" + err.Error())
	}
}

func update_last_sync() {
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}
	defer db.Close()

	//only save last 50 syncs
	_, err = db.Exec("DELETE FROM last_sync WHERE id NOT IN (SELECT id FROM last_sync ORDER BY id DESC LIMIT 50);")
	if err != nil {
		fail("Error deleting from database:" + err.Error())
	}

	_, err = db.Exec("INSERT INTO last_sync (last_sync) VALUES (datetime('now'));")
	if err != nil {
		fail("Error inserting into database:" + err.Error())
	}
}

func compare_hash_with_database(file_path string, file_hash string) bool {
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}
	defer db.Close()

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

	if hash == file_hash {
		return true
	}
	return false
}
