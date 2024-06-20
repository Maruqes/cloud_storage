package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/go-zoox/fetch"
)

type Tokens struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
}

var global_code string = ""
var global_tokens Tokens = Tokens{}

func fetch_upload_file(file *os.File, url string) (*fetch.Response, error) {

	testprint := strings.Replace(url, "https://graph.microsoft.com/v1.0/me/drive/root:/cloud_storage/", "", 1)
	fmt.Println("Uploading file:", strings.Replace(testprint, ":/content", "", 1))
	response, err := fetch.Put(url, &fetch.Config{
		Headers: map[string]string{
			"Authorization": "Bearer " + global_tokens.Token,
			"Content-Type":  "application/octet-stream",
		},
		Body: file,
	})
	return response, err
}

func upload_file_to_onedrive(file_path string, file_name_on_cloud string) {
	defer wg.Done()
	defer func() { number_of_files-- }()

	url := "https://graph.microsoft.com/v1.0/me/drive/root:/cloud_storage/" + file_name_on_cloud + ":/content"

	file, err := os.Open(file_path)
	if err != nil {
		fail("Error opening file:", err)
		return
	}
	defer file.Close()

	response, err := fetch_upload_file(file, url)

	if err != nil {
		fail("Error uploading file:", err)
		number_of_errors++
		return
	}

	fmt.Println("File uploaded with code:", response.StatusCode())
}

func delete_file_on_onedrive(file_name_on_cloud string) {
	url := "https://graph.microsoft.com/v1.0/me/drive/root:/cloud_storage/" + file_name_on_cloud

	response, err := fetch.Delete(url, &fetch.Config{
		Headers: map[string]string{
			"Authorization": "Bearer " + global_tokens.Token,
		},
	})

	if err != nil {
		fail("Error deleting file:", err)
		return
	}

	fmt.Println("File deleted with code:", response.StatusCode())
}

func donwload_file_from_onedrive(file_name_on_cloud string) {
	url := "https://graph.microsoft.com/v1.0/me/drive/root:/cloud_storage/" + file_name_on_cloud + ":/content"

	response, err := fetch.Get(url, &fetch.Config{
		Headers: map[string]string{
			"Authorization": "Bearer " + global_tokens.Token,
		},
	})

	if err != nil {
		fail("Error downloading file:", err)
		return
	}

	file_path := "/home/marques/cloud_storage/" + file_name_on_cloud

	file, err := os.Create(file_path)
	if err != nil {
		fail("Error creating file:", err)
		return
	}
	defer file.Close()

	_, err = file.Write(response.Body)
	if err != nil {
		fail("Error writing file:", err)
		return
	}

	fmt.Println("File downloaded with code:", response.StatusCode())
}

// api login functions
func call_graph_api(call string, tokens Tokens) (*fetch.Response, error) {
	url := "https://graph.microsoft.com/v1.0/" + call

	response, err := fetch.Get(url, &fetch.Config{
		Headers: map[string]string{
			"Authorization": "Bearer " + tokens.Token,
		},
	})

	if err != nil {
		fmt.Println("Error fetching data:", err)
		return nil, err
	}

	return response, nil
}

func get_tokens_from_file() (Tokens, error) {

	var tokens Tokens

	tokens_read, err := os.ReadFile("tokens.json")
	if err != nil {
		return tokens, err
	}

	err = json.Unmarshal(tokens_read, &tokens)
	if err != nil {
		fmt.Println("Error unmarshaling JSON:", err)
		return tokens, err
	}

	return tokens, nil
}

func create_login_link(settings Settings) {
	host := "https://login.microsoftonline.com"
	path := settings.TenentID + "/oauth2/v2.0/authorize"

	url := host + "/" + path

	url += "?client_id=" + settings.ClientID
	url += "&response_type=code"
	url += "&redirect_uri=http://localhost:8080"
	url += "&response_mode=query"
	url += "&scope=" + settings.GraphUserScope
	url += "&state=12345"

	global_code = ""
	fmt.Println("Login link:", url)

	for global_code == "" {
		time.Sleep(1 * time.Second)
	}

	fmt.Println("Code received:", global_code)
}

func refresh_token(tokens Tokens, settings Settings, is_code bool) (Tokens, error) {
	fmt.Println("Refreshing token")

	host := "https://login.microsoftonline.com"
	path := settings.TenentID + "/oauth2/v2.0/token"

	url := host + "/" + path

	var body map[string]string
	if is_code {
		body = map[string]string{
			"client_id":     settings.ClientID,
			"scope":         "https://graph.microsoft.com/.default offline_access",
			"code":          global_code,
			"redirect_uri":  "http://localhost:8080",
			"grant_type":    "authorization_code",
			"client_secret": settings.ClientSecret,
		}
	} else {
		body = map[string]string{
			"client_id":     settings.ClientID,
			"scope":         "https://graph.microsoft.com/.default offline_access",
			"refresh_token": tokens.RefreshToken,
			"grant_type":    "refresh_token",
			"client_secret": settings.ClientSecret,
		}
	}

	response, err := fetch.Post(url, &fetch.Config{
		Headers: map[string]string{
			"Content-Type": "application/x-www-form-urlencoded",
		},
		Body: body,
	})

	if err != nil {
		fmt.Println("Error fetching data:", err)
		return tokens, err
	}

	if response.StatusCode() != 200 {
		fmt.Println("Error refreshing token, status code:", response.StatusCode())
		return tokens, fmt.Errorf("error refreshing token, status code: %d", response.StatusCode())
	}

	json_string, err := response.JSON()
	if err != nil {
		fmt.Println("Error parsing JSON:", err)
		return tokens, err
	}

	//convert json string to struct

	new_tokens := struct {
		Token        string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		Scope        string `json:"scope"`
		TokenType    string `json:"token_type"`
	}{}
	err = json.Unmarshal([]byte(json_string), &new_tokens)
	if err != nil {
		fmt.Println("Error unmarshaling JSON:", err)
		return tokens, err
	}

	tokens.Token = new_tokens.Token
	tokens.RefreshToken = new_tokens.RefreshToken

	return tokens, nil
}

func login_the_account(tokens Tokens, settings Settings) (Tokens, error) {
	res, err := call_graph_api("/me", tokens)
	if err != nil {
		fmt.Println("Error calling graph API:", err)
		return tokens, err
	}

	status_code := res.StatusCode()

	if status_code == 401 {
		fmt.Println("Token expired, refreshing token")
		new_tokens, err := refresh_token(tokens, settings, false)
		if err != nil {
			fmt.Println("Error refreshing token:", err)

			create_login_link(settings)
			new_tokens, err = refresh_token(tokens, settings, true)

			if err != nil {
				fmt.Println("Error refreshing token:", err)
				return tokens, err
			}
		}
		tokens = new_tokens
	}

	if status_code != 200 && status_code != 401 {
		fmt.Println("Error calling graph API, status code:", status_code)
		return tokens, fmt.Errorf("error calling graph API, status code: %d", status_code)
	}

	res, err = call_graph_api("/me", tokens)
	if err != nil || res.StatusCode() != 200 {
		fmt.Println("Cannot login you:", err)
		return tokens, err
	}
	okay("Logged in successfully")

	return tokens, nil
}

func save_tokens_to_file(tokens Tokens) error {
	tokens_json, err := json.Marshal(tokens)
	if err != nil {
		fmt.Println("Error marshaling JSON:", err)
		return err
	}

	err = os.WriteFile("tokens.json", tokens_json, 0644)
	if err != nil {
		fmt.Println("Error writing file:", err)
		return err
	}

	return nil
}

func start_api(settings Settings) {
	info("Starting API")

	tokens, err := get_tokens_from_file()
	if err != nil {
		fmt.Println("Error getting tokens from file:", err)
		return
	}

	new_tokens, nil := login_the_account(tokens, settings)

	if err != nil {
		fmt.Println("Error logging in:", err)
		return
	}

	if tokens.Token != new_tokens.Token {
		fmt.Println("Token refreshed, saving to file")
		tokens = new_tokens
		err = save_tokens_to_file(tokens)
		if err != nil {
			fmt.Println("Error saving tokens to file:", err)
			return
		}
	}

	global_tokens = tokens
	okay("Tokens set, it`s ready")
}
