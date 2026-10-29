# Photo Sphere Studio 3D

Simulador de universo fotográfico en 3D: esferas de fotos y cuerpos celestes procedurales (planetas, estrellas, agujeros negros, nebulosas…) que orbitan entre sí, con modo Zen, viaje cinemático, efectos configurables y guardado local de universos.

Hecho con JavaScript moderno (módulos ES nativos), Three.js y Tailwind por CDN. No requiere compilación ni dependencias.

## Uso rápido

Los módulos ES no funcionan abriendo `index.html` con doble clic (`file://`); hay que servir la carpeta:

- **Windows:** doble clic en `iniciar.bat` (usa Python o Node.js) y se abre `http://localhost:8765/`.
- **Python:** `python -m http.server 8765` y abre `http://localhost:8765/`.
- **Node:** `npx http-server -p 8765`.
- **Alojamiento estático:** GitHub Pages, Apache, Nginx… basta con subir el contenido de esta carpeta (las rutas son relativas, funciona en subcarpetas).

Requiere conexión a internet para cargar Three.js, Tailwind y Lucide desde sus CDN.

## Características

- Esferas de fotos (arrastrar y soltar imágenes) y objetos celestes procedurales.
- Órbitas con excentricidad, inclinación y nodo configurables.
- Modos de distribución: personalizado, flotante, anillo, fila, constelación y espiral.
- Efectos de esfera y de escenario, vista Zen y viaje automático por el universo.
- Visor de fotos con pase de diapositivas.
- Responsive y táctil.
- Persistencia local en el navegador (IndexedDB) con exportar/importar JSON. Sin servidor ni base de datos.

## Estructura

```text
index.html     Punto de entrada
css/           Estilos
js/            Código (app, core, entities, interaction, persistence, ui, effects, config)
vendor/        Recursos locales de terceros
guia.md        Guía de diseño y arquitectura del proyecto
```

## Privacidad

Las fotos y universos se guardan solo en tu navegador. No hay claves de API ni variables de entorno: el proyecto no necesita un archivo `.env`.
