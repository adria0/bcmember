package config

import (
	"github.com/spf13/viper"
	"log"
	"os"
)

type Config struct {
	DataFolder string
	ServerSecret string
	Recaptcha struct {
		Code string
		Key string
	}
	WebServer struct {
		Prefix string
		WwwRoot string
		Bind string
		CertFile string
		KeyFile string
	}
	SmtpClient struct {
		From string
		Server string
		User string
		Password string
		Domain string
	}
	Web3Proxy struct {
		RpcServerUrl string
		Trace bool
	}
	Smartcontracts struct {
		AssetsAddress string
	}

}

var C Config

func init() {

	name, err := os.Hostname()
	if err != nil {
		panic(err)
	}

	viper.SetConfigType("yaml")
	viper.SetConfigName(name+"-bcserver")
	viper.AddConfigPath(".")
	viper.SetEnvPrefix("BCSERVER") 
	viper.AutomaticEnv()

	if err = viper.ReadInConfig(); err != nil {
		log.Fatal(err)
	}

	if err = viper.Unmarshal(&C); err != nil {
		log.Fatal(err)
	}
}