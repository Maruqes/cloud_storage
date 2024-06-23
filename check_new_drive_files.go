package main

import (
	"os"
)

func check_for_deleted_files(dir string) {

	files, err := os.ReadDir(dir)
	if err != nil {
		fail("Error reading directory:" + err.Error())
		return
	}

	for _, file := range files {
		if file.IsDir() {
			check_for_deleted_files(dir + file.Name() + "/")
		} else {
			if file.Name() == "cloud_storage.db" ||
				file.Name() == "cloud_storage_temp.db" ||
				file.Name() == "cloud_storage.db-journal" ||
				file.Name() == "cloud_storage_temp.db-journal" {
				continue
			}

			cur_dir := dir + file.Name()

			if !there_is_file(cur_dir) {
				info("File deleted:" + cur_dir)
				os.Remove(cur_dir)
			}
		}
	}

}

// if cloud_storage_temp.db has nothing there is a bug
func check_for_new_files_on_drive() {

	err := download_file_from_onedrive("cloud_storage_temp.db")
	if err != nil {
		fail("Error downloading file:" + err.Error())
		return
	}

	last_sync := temp_db_get_last_sync()

	our_last_sync := get_last_sync()

	if last_sync <= our_last_sync {
		info("No new files")
		return
	}

	info("New files found")

	//loop through all files and check all hashes

	temp_files, hashes := temp_db_get_files()

	for i, file := range temp_files {
		//check if file exists in our pc
		if _, err := os.Stat(MAIN_PATH + file); os.IsNotExist(err) {

			err = download_file_from_onedrive(file)
			if err != nil {
				fail("Error downloading file:" + err.Error())
				return
			}
			upload_file_to_database(file, hashes[i])
			info("File downloaded:" + file)
		} else {
			//check if file has changed
			file_buf, err := os.Open(MAIN_PATH + file)
			if err != nil {
				fail("Error opening file:" + err.Error())
				return
			}
			cur_file_hash := hash_file(file_buf)

			if hashes[i] != cur_file_hash {
				info("File has changed:" + file)
				// if file is new or has changed
				err = download_file_from_onedrive(file)
				if err != nil {
					fail("Error downloading file:" + err.Error())
					return
				}
				upload_file_to_database(file, hashes[i])
				info("File downloaded:" + file)
			}
		}
	}

	check_for_deleted_files(MAIN_PATH)
	update_last_sync()
}
