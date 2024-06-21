package main

import "database/sql"

func create_sqlite_db_and_tables() {
	// create a new database
	db, err := sql.Open("sqlite3", "./onedrive.db")
	if err != nil {
		fail("Error creating database:", err)
		return
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
		return
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS last_sync (
	id INTEGER PRIMARY KEY AUTOINCREMENT, 
	last_sync TEXT);`)
	if err != nil {
		fail("Error creating table:", err)
		return
	}

}
