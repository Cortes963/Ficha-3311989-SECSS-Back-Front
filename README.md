# Ficha-3311989-SECSS-Backend

## Guía de Buenas Prácticas: GitKraken, Git Flow y Estándares de Desarrollo

Este documento establece el flujo de trabajo oficial, las reglas de codificación y las buenas prácticas para asegurar la consistencia, estabilidad y escalabilidad de nuestro código. Todo miembro del equipo debe seguir estas directrices de manera estricta.

---

## 1. Estrategia de Ramificación: Git Flow

Utilizamos el modelo **Git Flow** para gestionar el ciclo de vida del software. Este modelo separa estrictamente el trabajo en desarrollo de las versiones estables y listas para producción.

### Las Dos Ramas Principales (Infinitas)

* `main` (o `master`): Contiene exclusivamente el código en estado **producción**. Cada commit en esta rama corresponde a una versión estable y desplegada. Está completamente protegida.
* `develop`: Es la rama de **integración**. Aquí se consolidan todas las nuevas funcionalidades terminadas para la próxima versión. Es la rama base para iniciar cualquier tarea.

### Ramas de Soporte (Temporales)

#### A. Ramas de Característica (`feature/*`)
* **Propósito:** Desarrollar nuevas funcionalidades, módulos o refactorizaciones.
* **Rama de origen:** `develop`
* **Rama de destino (Merge):** `develop` (a través de un Pull Request).
* **Nomenclatura:** `feature/HU-[Número_Historia]-[Breve_Descripción]` (Ejemplo: `feature/HU-04-login-auth`).

#### B. Ramas de Liberación (`release/*`)
* **Propósito:** Preparar una nueva versión para producción. Se utiliza para congelar el código, realizar pruebas QA finales y corregir bugs menores de última hora.
* **Rama de origen:** `develop`
* **Rama de destino (Merge):** `main` y `develop`.
* **Nomenclatura:** `release/v[Versión]` (Ejemplo: `release/v1.2.0`).

#### C. Ramas de Corrección Urgente (`hotfix/*`)
* **Propósito:** Reparar errores críticos detectados directamente en producción (`main`) que no pueden esperar al siguiente ciclo de release.
* **Rama de origen:** `main`
* **Rama de destino (Merge):** `main` y `develop`.
* **Nomenclatura:** `hotfix/v[Versión_Siguiente]` (Ejemplo: `hotfix/v1.2.1`).

---

## 2. Uso Eficiente de GitKraken

**GitKraken** es nuestra interfaz gráfica oficial para la gestión visual del historial de Git. Su uso reduce errores operativos si se configura correctamente.

### Configuración Mandatoria
1.  **Integración de Git Flow:** Activa el soporte nativo de Git Flow en GitKraken (*Preferences > Git Flow*). Esto automatizará la creación, prefijos y cierre de ramas (`feature`, `release`, `hotfix`) con un solo clic.
2.  **Autenticación SSH:** Utiliza llaves SSH vinculadas a GitHub en lugar de HTTPS con credenciales manuales para mitigar fugas de seguridad.
3.  **Auto-Fetch:** Configura el intervalo de Auto-Fetch a 5 o 10 minutos. Esto te permitirá ver visualmente en el grafo si un compañero subió cambios a `develop` antes de que intentes hacer un push.

### Operaciones Diarias en la Interfaz
* **Visualización del Grafo:** Antes de iniciar cualquier tarea, revisa el árbol gráfico. Asegúrate de que tu rama local no esté desactualizada respecto al origen (`origin/develop`).
* **Resolución de Conflictos:** GitKraken cuenta con un editor de conflictos integrado de tres paneles. No borres código a ciegas; si un conflicto involucra código ajeno, haz una llamada inmediata al desarrollador responsable antes de guardar los cambios.
* **Stashing:** Si necesitas cambiar urgentemente de rama para revisar un bug pero tu trabajo actual está a medias, utiliza el botón **Stash** en GitKraken para guardar tus cambios temporalmente sin generar commits sucios.

---

## 3. Estándar de Commits (Conventional Commits)

Los mensajes de commit deben ser claros, descriptivos y seguir la especificación de **Conventional Commits**. Esto permite la generación automática de changelogs y facilita la auditoría del código.

### Tipos Permitidos
* `feat`: Una nueva funcionalidad para el usuario.
  * *Ejemplo simple:* `feat: agregar boton de descarga de reportes en PDF`
  * *Ejemplo con alcance:* `feat(auth): implementar cifrado JWT en el flujo de login`
* `fix`: Solución a un error o bug en el código.
  * *Ejemplo simple:* `fix: corregir desalineacion en el menu lateral`
  * *Ejemplo con alcance:* `fix(db): corregir timeout en el procedimiento almacenado de reportes`
* `docs`: Cambios exclusivos en la documentación (ej. actualizar este README).
* `style`: Cambios que no afectan el significado del código (espacios en blanco, formateo con Prettier/ESLint, puntos y comas faltantes).
* `refactor`: Modificación de código que ni repara un error ni añade una funcionalidad (optimización, modularización).
* `test`: Añadir pruebas unitarias/integración faltantes o corregir existentes.
* `chore`: Tareas de mantenimiento, actualización de dependencias (`package.json`), configuraciones de build o herramientas de desarrollo.
