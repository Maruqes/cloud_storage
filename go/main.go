package main

import (
	"database/sql"
	"fmt"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	// Open the database file
	db, err := sql.Open("sqlite3", "test.db")
	if err != nil {
		fmt.Println("Error opening database:", err)
		return
	}
	defer db.Close()

	// Create a table if it doesn't exist
	_, err = db.Exec("CREATE TABLE IF NOT EXISTS numbers (id INTEGER PRIMARY KEY, value INTEGER)")
	if err != nil {
		fmt.Println("Error creating table:", err)
		return
	}

	// Insert a number into the table
	value := 42
	_, err = db.Exec("INSERT INTO numbers (value) VALUES (?)", value)
	if err != nil {
		fmt.Println("Error inserting number:", err)
		return
	}

	fmt.Println("Number inserted successfully!")
}