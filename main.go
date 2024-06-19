package main

import (
	// "database/sql"
	"fmt"
	"io/ioutil"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func list_all_files_on_folder_and_subfolders(path string) {

	files, err := ioutil.ReadDir(path)

	if err != nil {
		log.Fatal(err)
	}

	for _, file := range files {
		fmt.Println(path + "/" + file.Name())
		if file.IsDir() {
			list_all_files_on_folder_and_subfolders(path + "/" + file.Name())
		}
	}

}

func main() {
	list_all_files_on_folder_and_subfolders("/home/marques/cloud_storage")
	start_api()
	// // Open the database file
	// db, err := sql.Open("sqlite3", "test.db")
	// if err != nil {
	// 	fmt.Println("Error opening database:", err)
	// 	return
	// }
	// defer db.Close()

	// // Create a table if it doesn't exist
	// _, err = db.Exec("CREATE TABLE IF NOT EXISTS numbers (id INTEGER PRIMARY KEY, value INTEGER)")
	// if err != nil {
	// 	fmt.Println("Error creating table:", err)
	// 	return
	// }

	// // Insert a number into the table
	// value := 42
	// _, err = db.Exec("INSERT INTO numbers (value) VALUES (?)", value)
	// if err != nil {
	// 	fmt.Println("Error inserting number:", err)
	// 	return
	// }

	// fmt.Println("Number inserted successfully!")
}
