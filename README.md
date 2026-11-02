# Sheló NABEL 2026 — Catálogo Digital Interactivo y Tienda Oficial

Aplicación web full-stack para el catálogo interactivo **Sheló NABEL 2026** desarrollada para **Yesenia Jiménez** (Hermosillo, Sonora · WhatsApp `+52 632 103 7155`).

---

## ✨ Características Principales

1. **Identidad Oficial Sheló NABEL**:
   - Logotipo oficial en gran formato en la portada principal.
   - Menú interactivo estructurado sobre las **13 categorías del Índice oficial** (Páginas `01` a `142`).
2. **Detección Automática de Dispositivo y Sistema Operativo**:
   - Identifica en tiempo real el tipo de máquina (**Móvil**, **Tablet**, **Portátil** o **Escritorio**), el sistema operativo (**Android**, **iOS**, **Windows**, **macOS**, **Linux**, **ChromeOS**) y el navegador (**Chrome**, **Safari**, **Edge**, **Firefox**, etc.).
   - Adapta automáticamente la interfaz (barra inferior táctil en Android/iOS, atajos de teclado en Portátil/Escritorio y descarga/compartido nativo de PDF e imágenes según el sistema operativo).
3. **Visor de Catálogo de 148 Páginas y Descarga Segura de PDF**:
   - Visor interactivo página por página (`1` a `148`) compatible con todos los navegadores móviles y de escritorio.
   - Descarga autenticada en memoria (`Blob` stream `/api/catalog/pdf`) con barra de progreso para evitar bloqueos de cookies en navegadores móviles.
4. **Carrito de Compras y Pago por Transferencia vía WhatsApp (`+52 632 103 7155`)**:
   - Selección de productos con cálculo automático de subtotales y total en MXN.
   - Envío directo del pedido desglosado por WhatsApp para coordinar la transferencia bancaria.
5. **Panel Administrativo Multi-Usuario con Sesión Única**:
   - Acceso protegido mediante clave oculta (`****`).
   - **Bloqueo de sesión única**: Mientras el administrador está conectado, ningún otro usuario puede acceder al campo de clave ni abrir otra sesión administrativa.
   - **Cierre automático**: Al cerrar la pestaña o ventana del navegador, la sesión administrativa se cierra automáticamente mediante `navigator.sendBeacon` y desconexión SSE.
   - Edición de precios directamente sobre las imágenes de los productos y cambio de imágenes subiendo archivos desde la computadora o mediante URL.

---

## 🚀 Instalación y Ejecución Local (GitHub)

### Requisitos Previos
- **Node.js** `>= 18.x`
- **npm** `>= 9.x`

### Pasos para ejecutar el proyecto

```bash
# 1. Clonar el repositorio
git clone <URL_DE_TU_REPOSITORIO_GITHUB>
cd <NOMBRE_DEL_REPOSITORIO>

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo (Frontend + Backend en puerto 3000)
npm run dev
```

Abre en tu navegador: `http://localhost:3000`

### Compilación para Producción

```bash
# Compilar el frontend con Vite y verificar TypeScript
npm run lint
npm run build

# Iniciar servidor Express de producción
npm start
```

---

## 📁 Estructura del Proyecto

```text
├── data/
│   └── catalog.json                 # Base de datos JSON persistente sincronizada en tiempo real
├── public/
│   ├── assets/
│   │   ├── aistudio/                # Logotipo oficial, imagen de Índice y archivo PDF completo
│   │   └── catalog/                 # Páginas pre-renderizadas del catálogo oficial
│   └── uploads/                     # Imágenes subidas desde la computadora por el administrador
├── src/
│   ├── components/
│   │   ├── AdminModal.tsx           # Panel administrativo, bloqueo de sesión única y subida de imágenes
│   │   ├── CartDrawer.tsx           # Carrito de compras y enlace de transferencia por WhatsApp
│   │   ├── CatalogIndexMenu.tsx     # Menú visual interactivo basado en el Índice oficial
│   │   ├── CatalogLightboxModal.tsx # Visor de 148 páginas y descargador seguro de PDF
│   │   └── ProductCard.tsx          # Tarjeta de producto con precio editable sobre la imagen
│   ├── data/
│   │   └── initialCatalog.ts        # Semilla oficial de las 13 categorías y productos Sheló NABEL
│   ├── utils/
│   │   └── deviceDetector.ts        # Detector automático de Android, iOS, Móvil, Tablet, Portátil y Escritorio
│   ├── App.tsx                      # Aplicación principal y sincronización SSE multi-usuario
│   ├── index.css                    # Estilos globales con Tailwind CSS
│   ├── main.tsx                     # Punto de entrada React
│   └── types.ts                     # Definiciones TypeScript
├── package.json
├── server.ts                        # Servidor Express + SSE + API REST
├── tsconfig.json
└── vite.config.ts
```
