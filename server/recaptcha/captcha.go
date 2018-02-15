package recaptcha

import (
	"net/url"
	"net/http"
	"time"
	"encoding/json"
	"io/ioutil"
	"fmt"
)

type recaptchaResponse struct {
	Success bool `json:"success"`
}

func Verify(secret, captcha, remoteIp string) error {

    params := url.Values{}
    params.Add("remoteip", remoteIp)
    params.Add("response", captcha)
    params.Add("secret", secret )
	verificationURL := "https://www.google.com/recaptcha/api/siteverify"

	httpClient := &http.Client{Timeout: 10 * time.Second}
	httpResponse, err := httpClient.PostForm(verificationURL, params)
	defer httpResponse.Body.Close()
	body, err := ioutil.ReadAll(httpResponse.Body)
	
	if err!=nil {
		return err
	}

	var result recaptchaResponse
	
	err = json.Unmarshal([]byte(body), &result)
	
	if err!=nil {
		return err
	}

	if !result.Success 	{
		return fmt.Errorf("Captcha verification failed")			
	}

	return nil;	
}