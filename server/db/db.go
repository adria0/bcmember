package db

import(
	"github.com/adriamb/bcdapp/config"
	"encoding/json"
	"io/ioutil"
	"os"
	"log"
)

type Member struct {
	Address string `json:"address"`
	FirstName string `json:"firstName"`
	SecondName string `json:"secondName"`
	Mode string `json:"mode"`
	Interest string `json:"interest"`
	Email string `json:"email"`
	EmailVerified bool `json:"emailVerified"`
}

func init() {

	if _, err := os.Stat(config.C.DataFolder); os.IsNotExist(err) {
	    if err = os.MkdirAll(config.C.DataFolder, 0744) ; err != nil {
	    	log.Fatal(err)
	    }
	}

}

func Add(member *Member) error {

	serialized, err := json.Marshal(member)

	if err != nil {
		return err
	}

	return ioutil.WriteFile(config.C.DataFolder+"/member-"+member.Address,serialized,0744)	
}

func Update(member *Member) error {

	serialized, err := json.Marshal(member)

	if err != nil {
		return err
	}

	return ioutil.WriteFile(config.C.DataFolder+"/member-"+member.Address,serialized,0744)	
}

func Read(address string) (*Member,error) {

	serialized, err := ioutil.ReadFile(config.C.DataFolder+"/member-"+address)
	if err != nil {
		return nil,err
	}

	var member Member
	err = json.Unmarshal([]byte(serialized), &member)
	if err!=nil {
		return nil, err
	}

	return &member, nil
}


