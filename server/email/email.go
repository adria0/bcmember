package email

import (
	"github.com/adriamb/bcdapp/config"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/smtp"
	"net/url"
	"errors"
	emailer "github.com/jordan-wright/email"
)
type unsecurePlainAuth struct {
  	identity, username, password string
  	host                         string
}

func UnsecurePlainAuth(identity, username, password, host string) smtp.Auth {
	return &unsecurePlainAuth{identity, username, password, host}
}

func isLocalhost(name string) bool {
	return name == "localhost" || name == "127.0.0.1" || name == "::1"
}

func (a *unsecurePlainAuth) Start(server *smtp.ServerInfo) (string, []byte, error) {
	if server.Name != a.host {
		return "", nil, errors.New("wrong host name")
	}
	resp := []byte(a.identity + "\x00" + a.username + "\x00" + a.password)
	return "PLAIN", resp, nil
}

func (a *unsecurePlainAuth) Next(fromServer []byte, more bool) ([]byte, error) {
	if more {
		// We've already sent everything.
		return nil, errors.New("unexpected server challenge")
	}
	return nil, nil
}


func AuthCode(address, email string) string {
	mac := hmac.New(sha256.New, []byte(config.C.ServerSecret))
	mac.Write([]byte(address))
	mac.Write([]byte(email))
	sum := mac.Sum(nil)
	return hex.EncodeToString(sum)
}


func SendAuthEmail(address, email string) error {

	auth := UnsecurePlainAuth(
		"",
		config.C.SmtpClient.User,
		config.C.SmtpClient.Password,
		config.C.SmtpClient.Domain,
	)

	e := emailer.NewEmail()
	e.Headers.Add("Content-Transfer-Encoding","quoted-printable")
	e.From = config.C.SmtpClient.From
	e.To = []string{email}
	e.Subject = "Blockchain Catalunya - Verificació email"

    var link *url.URL
    link, err := url.Parse(config.C.WebServer.Prefix)
    if err != nil {
        return err
    }
    link.Path += "/emailreg"
    params := url.Values{}
    params.Add("address", address)
    params.Add("code", AuthCode(address,email))
    link.RawQuery = params.Encode()
    linkText := link.String()

    msg := "<h1>Blockchain catalunya</h1><br>Feu click <a href='"+linkText+"''>Aqui</a> per verificar el vostre email"

	e.HTML = []byte(msg)

	return e.SendWithTLS(config.C.SmtpClient.Server,auth,nil)
}

