# Documentación

Proyecto Bot

Este proyecto está basado en Express.

## Levantar proyecto en local

- Clonar el repositorio.
- Copiar el archivo `.env.example` a `.env` en la misma raíz con el comando: `cp .env.example .env`.
- Asignar las variables en el archivo `.env` con los datos correctos para operar. Al estar en local, es importante que la variable `NODE_ENV` esté en modo `development`.
- Instalar las dependencias con el comando `npm install`.
- Levantar el servidor con `npm run dev`.

## Endpoints disponibles

El proyecto por el momento solo cuenta con un endpoint, el cual se describe a continuación:

#### /api/chat

**Método:** POST

**Descripción:** Envía un mensaje de chat.

**Cabeceras:**

- `Authorization`: Bearer token.

**Parámetros requeridos:**

- `phone`: El número de teléfono al que se enviará el mensaje.
- `message`: El contenido del mensaje a enviar.

**Respuestas:**

- **Éxito (200):**

  ```json
  {
    "status": "success",
    "response": "mensaje variable"
  }
  ```

- **Error (422):**

  ```json
  {
    "errors": "los campos son requeridos"
  }
  ```

- **Error (404):**

  ```json
  {
    "error": "recurso no encontrado"
  }
  ```

- **Error (500):**

  ```json
  {
    "status": "error",
    "error": "detalle del error"
  }
  ```

## Despliegue a producción

Para desplegar a producción se basa en el sistema de tags de Git. Se debe buscar el último tag asignado con el siguiente comando:

```sh
git tag -l "**" | grep -E "^v" | sort -V | tail -n 1
```

Y asignar el consecutivo. El sistema de versiones se basa en versionamiento semántico `v000.000.000`. Una vez asignado el tag, se deberá hacer push con los tags. Para la versión CLI se utiliza:

```sh
git push --follow-tags
```

Una vez que se ha creado la imagen Docker en GitHub, se deberá ingresar al servidor, editar el archivo `docker-compose.yml`, agregar la nueva versión de la imagen de Docker creada y ejecutar `docker compose up -d` para que Docker descargue la nueva versión y la despliegue. Después, verificar que la imagen esté ejecutándose correctamente y listo, nuestra nueva versión estará disponible.
