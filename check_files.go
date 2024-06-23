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

const NUMBER_OF_FILES_THAT_CAN_BE_UPLOADED int = 5

func hash_file(file_buf *os.File) string {
	file_buf.Seek(0, 0) //sets it at the beginning of the file

	hash := sha256.New()
	if _, err := io.Copy(hash, file_buf); err != nil {
		fail("Error hashing file:" + err.Error())
		return ""
	}
	return hex.EncodeToString(hash.Sum(nil))
}

func upload_last_sync() {
	file_buf, err := os.Open(MAIN_PATH + "cloud_storage.db")
	if err != nil {
		fail("Error opening file:", err)
		return
	}
	defer file_buf.Close()

	err = upload_file_to_onedrive("cloud_storage_temp.db", file_buf)
	if err != nil {
		fail("Error uploading file:", err)
		return
	}

	okay("Uploaded last sync")
}

func upload_file(file_path string, file_buf *os.File) {
	defer file_buf.Close()
	defer wg.Done()
	defer func() { number_of_files-- }()

	var file_name_on_cloud string = strings.Replace(file_path, MAIN_PATH, "", 1)

	file_hash := hash_file(file_buf)
	if file_hash == "" {
		return
	}

	err := upload_file_to_onedrive(file_name_on_cloud, file_buf)
	if err != nil {
		fail("Error uploading file :", file_name_on_cloud+" Error: "+err.Error())
		return
	}
	okay("Uploaded file: " + file_name_on_cloud)

	upload_file_to_database(file_path, file_hash)
	update_last_sync()
	go upload_last_sync()

}

func upload_file_bicha(file_path string, file_buf *os.File) {
	number_of_files++
	wg.Add(1)
	go upload_file(file_path, file_buf)

	if number_of_files >= NUMBER_OF_FILES_THAT_CAN_BE_UPLOADED {
		info("Waiting for files to upload...")
		wg.Wait()
		info("Done uploading files")
	}
}

func loop_all_dirs(dir string) {

	files, err := os.ReadDir(dir)
	if err != nil {
		fail("Error reading directory:" + err.Error())
		return
	}

	for _, file := range files {
		if file.IsDir() {
			loop_all_dirs(dir + file.Name() + "/")
		} else {
			if file.Name() == "cloud_storage.db" ||
				file.Name() == "cloud_storage_temp.db" ||
				file.Name() == "cloud_storage.db-journal" ||
				file.Name() == "cloud_storage_temp.db-journal" {
				continue
			}

			cur_dir := dir + file.Name()

			file_buf, err := os.Open(cur_dir)
			if err != nil {
				fail("Error opening file:" + err.Error())
				return
			}
			cur_file_hash := hash_file(file_buf)

			if !compare_hash_with_database(cur_dir, cur_file_hash) {
				info("File has changed:" + cur_dir)
				// if file is new or has changed
				upload_file_bicha(cur_dir, file_buf)
			}
		}
	}

	wg.Wait()
}

func check_deleted_files() {
	files := get_all_files()
	for _, file := range files {

		file_w_main := MAIN_PATH + file

		if _, err := os.Stat(file_w_main); os.IsNotExist(err) {
			info("File deleted:" + file)

			delete_file_on_onedrive(file)
			delete_file_in_database(file_w_main)
			go upload_last_sync()
		}
	}
}

func check_all_files() {
	// for {
	// 	number_of_errors = 0
	// 	t1 := time.Now()

	// 	info("\n\nChecking all files...")

	// 	check_deleted_files()
	// 	loop_all_dirs(MAIN_PATH)

	// 	t2 := time.Now()
	// 	info("Time taken to check all files:" + t2.Sub(t1).String())
	// 	fail("Number of errors:" + strconv.Itoa(number_of_errors))
	// }
	check_for_new_files_on_drive()

}
