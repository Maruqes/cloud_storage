package main

import (
	"fmt"
	"os"
	"strings"
	"sync"
)

func loop_all_dirs(dir string) {

	wg := sync.WaitGroup{}

	files, err := os.ReadDir(dir)
	if err != nil {
		fail("Error reading directory:", err)
		return
	}

	for _, file := range files {
		if file.IsDir() {
			wg.Add(1)
			go loop_all_dirs(dir + file.Name() + "/")
		} else {
			cur_dir := dir + file.Name()
			fmt.Println(cur_dir)

			upload_file_to_onedrive(cur_dir, strings.Replace(cur_dir, MAIN_PATH, "", 1))
		}
	}

	wg.Wait()
}
func check_all_files() {
	loop_all_dirs("/home/marques/cloud_storage/")
}
