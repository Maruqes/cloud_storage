package main

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"os"
	"strings"
	"sync"
)

var wg sync.WaitGroup
var number_of_files int = 0
var number_of_errors int = 0

var NUMBER_OF_FILES_THAT_CAN_BE_UPLOADED int = 5

func hash_file(file_buf *os.File) string {
	hash := sha256.New()
	if _, err := io.Copy(hash, file_buf); err != nil {
		fail("Error hashing file:", err)
		return ""
	}
	return hex.EncodeToString(hash.Sum(nil))
}

func upload_file(file_path string) {
	var file_name_on_cloud string = strings.Replace(file_path, MAIN_PATH, "", 1)

	file_buf, err := os.Open(file_path)
	if err != nil {
		fail("Error opening file:", err)
		return
	}
	defer file_buf.Close()

	upload_file_to_onedrive(file_path, file_name_on_cloud, file_buf)
}

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
			go upload_file(cur_dir)

			if number_of_files >= NUMBER_OF_FILES_THAT_CAN_BE_UPLOADED {
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
