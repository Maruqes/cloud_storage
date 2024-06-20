package main

import (
	"os"
	"strings"
	"sync"
)

var wg sync.WaitGroup
var number_of_files int = 0
var number_of_errors int = 0

func loop_all_dirs(dir string) {

	files, err := os.ReadDir(dir)
	if err != nil {
		fail("Error reading directory:", err)
		return
	}

	for _, file := range files {
		if file.IsDir() {
			loop_all_dirs(dir + file.Name() + "/")
		} else {
			cur_dir := dir + file.Name()
			info(cur_dir)

			number_of_files++

			wg.Add(1)
			go upload_file_to_onedrive(cur_dir, strings.Replace(cur_dir, "/home/marques/cloud_storage/", "", 1))

			if number_of_files >= 5 {
				info("Waiting for files to upload...")
				wg.Wait()
				info("Done uploading files")
			}
		}
	}

}
func check_all_files() {
	loop_all_dirs("/home/marques/cloud_storage/")
	fail("Number of errors:", number_of_errors)
}
