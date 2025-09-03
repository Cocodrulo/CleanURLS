# GitHub Actions Workflows

Este proyecto incluye workflows automatizados de GitHub Actions para compilar y crear releases de la extensión CleanURLs.

## 📁 Estructura

```
.github/
└── workflows/
    ├── build.yml        # Build y test en cada push/PR
    └── release.yml      # Crear releases automáticos
```

## 🔄 Workflows

### 1. Build Workflow (`build.yml`)

**Se ejecuta en:** 
- Push a `main` o `develop`
- Pull requests a `main`

**Funciones:**
- ✅ Valida el `manifest.json`
- ✅ Verifica que todos los archivos necesarios existan
- ✅ Crea un build de prueba
- ✅ Sube el build como artifact (disponible por 7 días)

### 2. Release Workflow (`release.yml`)

**Se ejecuta en:**
- Push a la rama `main`

**Funciones:**
- 🏷️ Lee la versión del `manifest.json`
- 🔍 Verifica si ya existe un tag para esa versión
- 📦 Crea el paquete de la extensión (ZIP)
- 📋 Crea el paquete del código fuente
- 🚀 Crea un release automático en GitHub
- 📎 Adjunta ambos archivos ZIP al release

## 📦 Archivos generados

Cada release incluye:

1. **`CleanURLs-vX.X.X.zip`** - Extensión lista para instalar
   - Contiene solo los archivos necesarios para la extensión
   - Listo para cargar en Chrome como "extensión desempaquetada"

2. **`CleanURLs-source-vX.X.X.zip`** - Código fuente
   - Incluye todo el proyecto excepto archivos de test y .git
   - Para desarrolladores que quieran revisar o modificar el código

## 🚀 Cómo crear un nuevo release

### Método Automático (Recomendado)

1. **Actualiza la versión** en `manifest.json`:
   ```json
   {
     "version": "1.4.0"
   }
   ```

2. **Commit y push** a la rama `main`:
   ```bash
   git add manifest.json
   git commit -m "chore: bump version to 1.4.0"
   git push origin main
   ```

3. **El workflow automáticamente:**
   - Detectará la nueva versión
   - Creará el tag `v1.4.0`
   - Compilará la extensión
   - Creará el release con los archivos adjuntos

### Verificación

Después del push, puedes:

1. Ir a la pestaña **Actions** en GitHub para ver el progreso
2. Verificar que el workflow se ejecute sin errores  
3. Comprobar que el release aparezca en la sección **Releases**

## ⚠️ Notas importantes

- **Solo crea releases desde `main`**: Los pushes a otras ramas solo ejecutan builds de prueba
- **Versionado automático**: La versión se lee automáticamente del `manifest.json`
- **Sin duplicados**: Si ya existe un tag para una versión, no se crea un nuevo release
- **Archivos incluidos**: Solo se incluyen los archivos necesarios para la extensión (no test files)

## 🛠️ Solución de problemas

### El workflow falla
1. Revisa los logs en la pestaña Actions
2. Verifica que el `manifest.json` sea válido JSON
3. Asegúrate de que todos los archivos referenciados existan

### No se crea el release
1. Verifica que el push sea a la rama `main`
2. Comprueba que la versión en `manifest.json` sea nueva
3. Revisa los permisos del repositorio (debe tener Actions habilitado)

### Problemas de permisos
Si ves errores de permisos, verifica que:
- GitHub Actions esté habilitado en el repositorio
- El token `GITHUB_TOKEN` tenga permisos para crear releases

## 📝 Personalización

Para modificar los workflows:

1. **Cambiar archivos incluidos**: Edita la sección de copiado en `release.yml`
2. **Modificar el mensaje del release**: Actualiza la sección `body` en `release.yml`
3. **Agregar más validaciones**: Añade steps adicionales en `build.yml`

---

Este sistema automatiza completamente el proceso de release, asegurando builds consistentes y releases profesionales. 🎉
