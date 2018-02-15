package jsonrpc

import (
	"github.com/ethereum/go-ethereum/rlp"
	"github.com/ethereum/go-ethereum/common"	
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gin-gonic/gin"
	"encoding/json"
	"io/ioutil"
	"fmt"
	"strings"
	"log"
	"encoding/hex"
)

type InMsg struct {
	Jsonrpc string `json:"jsonrpc"`
	Method  string `json:"method"`
	Params  []interface{} `json:"params"`
	Id      uint `json:"id"`
}

type ErrorMsg struct {
	Code uint `json:"code"`
	Message string `json:"message"`
}

type OutMsg struct {
	Jsonrpc string `json:"jsonrpc"`
	Error *ErrorMsg `json:"error,omitempty"`
	Data interface{} `json:"data,omitempty"`
	Id uint `json:"id"`
}

var (

	ErrInternal = &ErrorMsg{
		Code:    999,
		Message: "Error intern",
	}

	errBadMsgFormat = &ErrorMsg{
		Code : 10001,
		Message : "Bad message format",
	}

	errBadSignature = &ErrorMsg{
		Code : 10002,
		Message : "Bad signature",
	}

	errUnknownMethod = &ErrorMsg{
		Code:    10003,
		Message: "Unknown method",
	}

	handles map[string]Handler = make(map[string]Handler)
)

type Handler func (*gin.Context, string,[]interface{})(interface{},*ErrorMsg)

func verifyMsg(in InMsg, signature string) ([]interface{}, string,error) {

	args := in.Params[:len(in.Params)-1]
	address := in.Params[len(in.Params)-1].(string)

	sig,err := hex.DecodeString(signature)
	if err != nil {
		return nil,"",err
	}
	sig[len(sig)-1] -= 27;

	signedData := append(args,in.Method, in.Id)
	data, err := rlp.EncodeToBytes(signedData)
	if err != nil {
		return nil,"",err
	}

	pubKey, err := crypto.Ecrecover(crypto.Keccak256(data), sig)
	if err != nil {
		return nil,"",err
	}

	sigAddress := common.BytesToAddress(common.LeftPadBytes(crypto.Keccak256(pubKey[1:])[12:], 32))
	sigAddressStr := strings.ToLower(sigAddress.String())
	if sigAddressStr != address {
		return nil,"",fmt.Errorf("Signature mismatch [expected="+address+" got="+sigAddressStr+"]")
	}

	return args,address,nil
}

func Register(method string, h Handler) {
	handles[method] = h
}

func Handle(c *gin.Context) {

	header := c.GetHeader("Authorization")
	auth := strings.Split(header," ")
	if len(auth) != 2 {
		log.Printf("Bad authentication header (1) ["+header+"]")
		return
	}

	if auth[0] != "Signature" {
		log.Printf("Bad authentication header (2)["+header+"]")
		return
	}

	var err error
	var in InMsg
	var rpcErr *ErrorMsg
	var retvalue interface{}

	inraw, err := ioutil.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Failed reading request body",err)
		return
	}
	
	dec := json.NewDecoder(strings.NewReader(string(inraw)))
	err = dec.Decode(&in)

	if err == nil {

		if handle, found := handles[in.Method] ; found {

			var address string
			var args []interface{}

			args,address,err = verifyMsg(in,auth[1])

			if err == nil {
				retvalue, rpcErr = handle(c,address,args)
			} else {
				rpcErr = errBadSignature
			}

		} else {
			rpcErr = errUnknownMethod
		}

	} else {
		log.Printf("[%s]",string(inraw))
		rpcErr = errBadMsgFormat
	}

	out := &OutMsg{
		Jsonrpc : "2.0",
		Id : in.Id,
		Error : rpcErr,
		Data : retvalue,
	}

	c.JSON(200, out)

	if rpcErr != nil {
		log.Printf("%#v => %#v [rpcerr=%s] [interr=%v]\n",
			in,out,rpcErr.Message,err)
	} else {
		log.Printf("%#v => %#v\n",in,out)
	}
}
