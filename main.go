package main

import (
	// "database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

/*
A SER VISTO
CASO ACABE DURANTE A EXECUÇÃO DO PROGRAMA A TOKEN Q CARALHOS ACONTECE FODASEKKKK????
*/

var MAIN_PATH = ""

type Settings struct {
	ClientID             string   `json:"clientId"`
	ClientSecret         string   `json:"clientSecret"`
	TenentID             string   `json:"tenantId"`
	GraphUserScope       string   `json:"user_scopes"`
	GraphUserScopesArray []string `json:"user_scopes_arr"`
}

func okay(a ...any) (n int, err error) {
	return fmt.Printf("\033[32m"+a[0].(string)+"\033[0m\n", a[1:]...)
}

func warn(a ...any) (n int, err error) {
	return fmt.Printf("\033[33m"+a[0].(string)+"\033[0m\n", a[1:]...)
}

func info(a ...any) (n int, err error) {
	return fmt.Printf("\033[34m"+a[0].(string)+"\033[0m\n", a[1:]...)
}

func fail(a ...any) (n int, err error) {
	return fmt.Printf("\033[31m"+a[0].(string)+"\033[0m\n", a[1:]...)
}

func start_server() {

	info("Starting server...")
	// register the handler function
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		global_code = code
		fmt.Fprintf(w, "Code: %s\n", code)
	})

	// start web server on 8080
	http.ListenAndServe(":8080", nil)
}

func start_server_thread() {
	go start_server()
}

func main() {
	homeDir, _ := os.UserHomeDir()
	MAIN_PATH = homeDir + "/cloud_storage/"

	file, err := os.Open(MAIN_PATH)
	if err != nil {
		os.Mkdir(MAIN_PATH, 0777)
	}
	file.Close()

	// create the database and tables
	res, err := create_sqlite_db_and_tables()
	if res != 0 {
		fail("Error creating database " + err.Error())
		return
	}

	start_server_thread()

	//read secrets.json and print
	secrets, err := os.ReadFile("secrets.json")
	if err != nil {
		fmt.Println("Error reading file:", err)
		return
	}

	settings := Settings{}

	err = json.Unmarshal(secrets, &settings)
	if err != nil {
		fmt.Println("Error unmarshaling JSON:", err)
		return
	}

	start_api(settings)

	check_all_files()
}
