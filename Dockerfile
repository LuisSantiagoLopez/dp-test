# Usa la imagen base de Node.js
FROM node:18-alpine

# Instala openssl
RUN apk add --no-cache openssl

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos package.json y package-lock.json (o yarn.lock)
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Instala tsx globalmente
RUN npm install -g tsx

# Copia el resto de los archivos de la aplicación
COPY . .

RUN openssl req -x509 -nodes -newkey rsa:4096 -keyout /app/key.pem -out /app/cert.pem -days 1825 -subj '/CN=beesure.today'

EXPOSE 443

# Comando para ejecutar la aplicación con tsx
CMD ["tsx", "src/server.ts"]