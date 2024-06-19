package main

import (
	"fmt"
	"io/ioutil"
	"log"
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
