package auth

import (
  	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"github.com/adriamb/bcdapp/config"
	"encoding/base64"
  	"strings"	
	"time"
	"fmt"
)

func JwtCreateToken(address string) (string,error) {
	expiration := time.Now().Add(time.Hour*2)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
	    // Subject
	    "sub": address,
	    // Expiration time
	    "exp": expiration.Unix(),
	})

	// Sign and get the complete encoded token as a string using the secret
	tokenString, err := token.SignedString([]byte(config.C.ServerSecret))
	if err != nil {
		return "",err
	}

	return tokenString,nil
}

func JwtVerifyToken(tokenString string) (string,error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
	    if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
	        return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
	    }
	    return []byte(config.C.ServerSecret), nil
	})	
	if err != nil {
		return "",err
	}
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
	    return claims["sub"].(string), nil
	} else {
	    return "",err
	}
}

func JwtVerifyHeaders(c *gin.Context) (string,error) {

	header := c.GetHeader("Authorization")
	authheader := strings.Split(header," ")
	if len(authheader) != 2 {
		return "",fmt.Errorf("Bad authentication header (1) ["+header+"]")
	}

	if authheader[0] != "Basic" {
		return "",fmt.Errorf("Bad authentication header (2) ["+header+"]")
	}

	userpass,err := base64.StdEncoding.DecodeString(authheader[1])
	if err != nil {
		return "",fmt.Errorf("Bad authentication header (3) ["+header+"]")
	}

	splitted := strings.Split(string(userpass),":")
	if len(splitted) != 2 || splitted[0] != "jwt" {
		return "",fmt.Errorf("Bad authentication header (4) ["+header+"]")
	}

	address, err := JwtVerifyToken(splitted[1])
	if err != nil {
		return "",fmt.Errorf("Bad authentication header (5) ["+header+"]")
	}
	return address, nil
}
