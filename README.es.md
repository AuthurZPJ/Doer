# Doer

[English](./README.md) | [简体中文](./README.zh-CN.md) | [Español](./README.es.md)

Una aplicación web local para ayudarle a registrar y gestionar su trabajo.

## Características

- **Panel**: Vista general de todas las categorías (En progreso, Planes futuros, Reuniones, Conocimiento), con entrada rápida en la parte superior
- **En progreso (Doing)**: Gestión de tareas en curso con subtareas anidadas (profundidad ilimitada), edición al hacer clic, seguimiento de finalización de subtareas y fechas límite
- **Planes futuros**: Gestión de tareas pendientes con prioridad y fechas límite, agrupadas por fecha límite, se transfiere automáticamente a Doing con la fecha límite preservada
- **Reuniones**: Registrar título, contenido y fecha de reuniones, con soporte de edición
- **Conocimiento**: Registrar puntos de conocimiento, expandible/colapsable
- **Informe semanal**: Resume automáticamente los elementos completados diariamente y el progreso de subtareas, agrupados por etiquetas, exportación a Markdown (semana actual / rango de semanas / desde una semana especificada hasta esta semana)
- **Búsqueda global**: Buscar en todos los módulos
- **Gestión de etiquetas**: Crear, editar, eliminar etiquetas con colores, autocompletado global
- **Copia de seguridad y restauración**: Panel de gestión de copias de seguridad con crear, restaurar y eliminar
- **Modo oscuro**: Alternar entre tema claro/oscuro
- **CLI de registro rápido**: Registrar desde la terminal sin abrir el navegador
- **Aplicación de escritorio**: Soporte para empaquetado con Electron

## Stack tecnológico

- Frontend: React + Vite + TypeScript + TailwindCSS
- Backend: Express + TypeScript + better-sqlite3
- Base de datos: SQLite
- Escritorio: Electron

## Inicio

### Modo web

```bash
npm install
npm run dev
```

Frontend en http://localhost:5173, backend en http://localhost:3001, abre el navegador automáticamente al iniciar.

### Modo escritorio (Electron)

```bash
npm install
npm run build
npm run electron
```

Modo desarrollo:

```bash
npm run electron:dev
```

Empaquetar como instalador:

```bash
npm run build
npx electron-builder --config electron-builder.cjs
```

## Uso de CLI

Enlazar globalmente:

```bash
npm link
```

Luego usar desde cualquier lugar:

```bash
doer página de login terminada        # Añadir a Doing
doer -t frontend,urgente corregir bug  # Añadir a Doing con etiquetas
doer -p investigar OAuth --priority high  # Añadir a Planes futuros
doer -m reunión semanal               # Añadir reunión
doer -l React Hooks                   # Añadir conocimiento
doer list                             # Ver lista de Doing
doer todos                            # Ver Planes futuros
doer complete 3                       # Completar tarea
doer start 1                          # Comenzar desde Planes futuros
```

La variable de entorno `DOER_API` puede especificar la URL del backend (predeterminado: `http://localhost:3001/api`).

## Almacenamiento de datos

Base de datos SQLite en `server/data/doer.db`, copias de seguridad en `server/data/backups/`.
