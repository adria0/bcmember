package main

import (
	"fmt"
	"github.com/adriamb/bcdapp/config"
	"github.com/adriamb/bcdapp/db"
	"github.com/adriamb/bcdapp/email"
	"github.com/adriamb/bcdapp/jsonrpc"
	"github.com/adriamb/bcdapp/auth"
	"github.com/adriamb/bcdapp/recaptcha"
	"github.com/gin-gonic/gin"
	"net/http"
	"io/ioutil"
  	"log"
  	"bytes"
)

var (
	errUnregistered = &jsonrpc.ErrorMsg{
		Code:    993,
		Message: "No registrat",
	}

	errAlreadyRegistered = &jsonrpc.ErrorMsg{
		Code:    994,
		Message: "Adreça ja registrada",
	}
)

type BcRegisterOutMsg struct {
	JWT string `json:"jwt"`
}

type BcAuthOutMsg struct {
	JWT string `json:"jwt"`
	Member *db.Member `json:"member"`
}

func jsonRpcRegister(c *gin.Context, address string, args []interface{}) (interface{}, *jsonrpc.ErrorMsg) {

	if len(args) != 6 {
		log.Print("*err bad-bc-register-args", len(args))
		return nil, jsonrpc.ErrInternal
	}

	firstName := args[0].(string)
	secondName := args[1].(string)
	useremail := args[2].(string)
	mode := args[3].(string)
	interest := args[4].(string)
	captcha := args[5].(string)

	err := recaptcha.Verify(config.C.Recaptcha.Key, captcha, c.ClientIP())
	if err != nil {
		log.Print("*err recaptcha-verify", err)
		return nil, jsonrpc.ErrInternal
	}

	member, err := db.Read(address)
	if err == nil {
		if member.EmailVerified {
			return nil, errAlreadyRegistered
		}
	}

	err = db.Add(&db.Member{
		Address:    address,
		FirstName:  firstName,
		SecondName: secondName,
		Email:      useremail,
		Mode:       mode,
		Interest:   interest,
	})

	if err != nil {
		log.Print("*err db-add", err)
		return nil, jsonrpc.ErrInternal
	}
	err = email.SendAuthEmail(address, useremail)
	if err != nil {
		log.Print("*err db-sendmail", err)
		return nil, jsonrpc.ErrInternal
	}
	token,err := auth.JwtCreateToken(address)
	if err != nil {
		log.Print("*err db-createtoken", err)
		return nil, jsonrpc.ErrInternal
	}

	return &BcRegisterOutMsg{token},nil 

}

func jsonRpcAuth(c *gin.Context, address string, args []interface{}) (interface{}, *jsonrpc.ErrorMsg) {

	member, err := db.Read(address)
	if err != nil {
		return nil, errUnregistered
	}

	token, err := auth.JwtCreateToken(address)
	if err != nil {
		log.Print("*err db-createtoken", err)
		return nil, jsonrpc.ErrInternal
	}

	return &BcAuthOutMsg{token, member}, nil

}

func web3proxy(c *gin.Context) {

	_, err := auth.JwtVerifyHeaders(c)
	if err != nil {
        c.String(500,"Internal error")
		return
	}

	inraw, err := ioutil.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Failed reading request body",err)
        c.String(500,"Internal error")
		return
	}

	if config.C.Web3Proxy.Trace {
		log.Printf("web3 IN %v",string(inraw))
	}

  	client := http.Client{}
    req, err := http.NewRequest("POST", config.C.Web3Proxy.RpcServerUrl, bytes.NewBuffer(inraw))
    resp, err := client.Do(req)
    if err != nil {
		log.Printf("Failed reading request body",err)
        c.String(500,"Internal error")
        return
    }
    outraw, _ := ioutil.ReadAll(resp.Body)

	if config.C.Web3Proxy.Trace {
		log.Printf("web3 OUT %v",string(outraw))
	}

    c.String(200,string(outraw))

}

func GETVerifyEmail(c *gin.Context) {

	address := c.Query("address")
	code := c.Query("code")

	member, err := db.Read(address)
	if err == nil {
		expectedCode := email.AuthCode(address, member.Email)
		if expectedCode == code {
			member.EmailVerified = true
			db.Update(member)
		} else {
			err = fmt.Errorf("Codi incorrecte")
		}
	}

	if err == nil {
		c.String(200, "Correu registrat correctament.")
	} else {
		c.String(200, "No s'ha pogut regisrar el correu.")
	}

}

type FrontendConfig struct {
	AssetsContractAddress  string `json:"assetsContractAddress"`
}

func GETConfig(c *gin.Context) {

	cfg := &FrontendConfig{
		AssetsContractAddress : config.C.Smartcontracts.AssetsAddress,
	}

	c.JSON(200, cfg)
}


func main() {

	r := gin.Default()

	// web3 proxy
	r.POST("/web3", web3proxy)

	// www
	r.Static("/dapp", config.C.WebServer.WwwRoot)

	jsonrpc.Register("bc_register",jsonRpcRegister)
	jsonrpc.Register("bc_auth",jsonRpcAuth)
	r.POST("/rpc", jsonrpc.Handle)

	// internal calls
	r.GET("/emailreg", GETVerifyEmail)
	r.GET("/config", GETConfig)

	r.RunTLS(config.C.WebServer.Bind, config.C.WebServer.CertFile, config.C.WebServer.KeyFile)
	
}
