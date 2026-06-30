#!/bin/sh
set -eu  # Exit immediately if a command exits with a non-zero status, and treat unset variables as an error

CERT_DIR="/etc/nginx/certs"  # Directory to store the self-signed certificate and key
CERT_FILE="${CERT_DIR}/cert.pem"  # Path to the certificate file
KEY_FILE="${CERT_DIR}/key.pem" 	# Path to the private key file

mkdir -p "${CERT_DIR}"  # Create the directory if it doesn't exist

# Check if the certificate and key files already exist, and generate them if they don't
if [ ! -f "${CERT_FILE}" ] || [ ! -f "${KEY_FILE}" ]; then
    echo "Generating self-signed certificate for localhost..."
	# Generate a self-signed certificate using OpenSSL with the specified subject information
    openssl req \
        -x509 \
        -nodes \
        -days 365 \
        -newkey rsa:2048 \
        -keyout "${KEY_FILE}" \
        -out "${CERT_FILE}" \
        -subj "/C=NL/ST=Noord-Holland/L=Amsterdam/O=ft_transcendence/OU=Evaluation/CN=localhost"
fi

exec nginx -g 'daemon off;'  # Start Nginx in the foreground to keep the container running
