package main

import (
	"database/sql"
	"strings"
)

func temp_db_get_last_sync() string {
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage_temp.db")
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

func temp_db_get_files() ([]string, []string) {
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage_temp.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}
	defer db.Close()

	rows, err := db.Query("SELECT * FROM files;")
	if err != nil {
		fail("Error selecting from database:" + err.Error())
	}
	defer rows.Close()

	var files []string
	var hashes []string
	for rows.Next() {
		var id string
		var file_path string
		var file_hash string
		err = rows.Scan(&id, &file_path, &file_hash)
		if err != nil {
			fail("Error scanning from database:" + err.Error())
		}

		files = append(files, file_path)
		hashes = append(hashes, file_hash)
	}

	return files, hashes
}

func there_is_file(file string) bool {
	db, err := sql.Open("sqlite3", MAIN_PATH+"cloud_storage_temp.db")
	if err != nil {
		fail("Error opening database:" + err.Error())
	}
	defer db.Close()

	file = strings.Replace(file, MAIN_PATH, "", 1)

	rows, err := db.Query("SELECT * FROM files WHERE file_path = ?;", file)
	if err != nil {
		fail("Error selecting from database:" + err.Error())
	}
	defer rows.Close()

	return rows.Next()
}
