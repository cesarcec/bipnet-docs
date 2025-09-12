## Gestor de Documentos (Express + MySQL)

Aplicación sencilla con login por JWT, formulario para registrar documentos (destinatario, origen, fecha, lugar, motivo) y subida de archivos (PDF/imagenes/DOCX) mediante arrastrar y soltar, más listado con filtros por origen, lugar y fechas.

### Requisitos
- Node.js 18+
- MySQL 8+
- Ubuntu o similar

### Instalación
```bash
cd documento
npm install
```

Crear archivo `.env` en `documento/` con contenido (ajusta credenciales):
```
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=documento_app
JWT_SECRET=un_secreto_largo_y_unico
ADMIN_PASSWORD=admin123
```

Crear base de datos en MySQL (una vez):
```sql
CREATE DATABASE documento_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Ejecutar migraciones y usuario inicial:
```bash
npm run migrate
```

Iniciar servidor:
```bash
npm run dev
```

Abrir en navegador: `http://localhost:3000/`

Credenciales por defecto: usuario `admin`, contraseña la definida en `ADMIN_PASSWORD` (por defecto `admin123`).

### Endpoints (API)
- POST `/api/auth/login` → `{ username, password }` → `{ token }`
- POST `/api/documents` (Bearer token) → FormData con campos y `files[]`
- GET `/api/documents?origen=&lugar=&desde=&hasta=` (Bearer token)

### Notas
- Archivos subidos se guardan en `uploads/` y se sirven en `/uploads/<filename>`.
- Índices por `origen`, `lugar` y `fecha` para mejorar filtros.
- Para producción, usar `pm2` o `systemd` y opcionalmente Nginx como proxy TLS.


