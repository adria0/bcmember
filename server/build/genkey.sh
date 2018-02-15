mkdir config
openssl genrsa -out config/server.key 2048
openssl req -new -x509 -sha256 -key config/server.key -out config/server.crt -days 3650 -subj '/CN=www.blockchaincatalunya.org'
