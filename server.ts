import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_CATALOG_DATA } from './src/data/initialCatalog.ts';
import { CatalogData, Product } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function loadCatalog(): CatalogData {
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      const raw = fs.readFileSync(CATALOG_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as CatalogData;
      // Non-destructively ensure all 33 seed products exist without overwriting existing edits
      const existingClaves = new Set(parsed.products.map((p) => p.clave));
      let added = false;
      for (const seedProd of INITIAL_CATALOG_DATA.products) {
        if (!existingClaves.has(seedProd.clave)) {
          parsed.products.push(structuredClone(seedProd));
          added = true;
        }
      }
      if (added) {
        fs.writeFileSync(CATALOG_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading catalog.json, using initial seed:', err);
  }
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(INITIAL_CATALOG_DATA, null, 2), 'utf-8');
  return structuredClone(INITIAL_CATALOG_DATA);
}

function saveCatalog(data: CatalogData) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

let catalogData: CatalogData = loadCatalog();

// Single Active Admin Session State (Server-Authoritative)
const ADMIN_PIN = '1990';
const ADMIN_TIMEOUT_MS = 12000; // 12 seconds without heartbeat or SSE disconnect releases lock

interface ActiveAdminSession {
  token: string;
  clientId: string;
  connectedAt: number;
  lastHeartbeat: number;
}

let activeAdmin: ActiveAdminSession | null = null;

// Connected Multi-User SSE Clients
interface SSEClient {
  id: string;
  res: express.Response;
}

const clients = new Map<string, SSEClient>();

function cleanupExpiredAdmin(): boolean {
  if (activeAdmin && Date.now() - activeAdmin.lastHeartbeat > ADMIN_TIMEOUT_MS) {
    activeAdmin = null;
    return true;
  }
  return false;
}

function getAdminStatusPayload() {
  cleanupExpiredAdmin();
  return {
    isAdminConnected: activeAdmin !== null,
    connectedSince: activeAdmin ? activeAdmin.connectedAt : null,
    activeUsersCount: Math.max(1, clients.size),
  };
}

function broadcastEvent(event: string, payload: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const [id, client] of clients.entries()) {
    try {
      client.res.write(message);
    } catch {
      clients.delete(id);
    }
  }
}

function broadcastAdminStatus() {
  broadcastEvent('admin:status', getAdminStatusPayload());
}

// Periodic check for stale admin sessions
setInterval(() => {
  if (cleanupExpiredAdmin()) {
    broadcastAdminStatus();
  }
}, 3000);

function verifyAdminToken(req: express.Request): boolean {
  cleanupExpiredAdmin();
  if (!activeAdmin) return false;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();
  if (token === activeAdmin.token) {
    activeAdmin.lastHeartbeat = Date.now();
    return true;
  }
  return false;
}

const execFileAsync = promisify(execFile);
const PDF_FILE_PATH = path.join(
  __dirname,
  'public',
  'assets',
  'aistudio',
  'Catalogo_Shelo_NABEL2026_SyG_fd41deed.pdf'
);
const PAGES_CACHE_DIR = path.join(__dirname, 'public', 'assets', 'catalog_pages');
if (!fs.existsSync(PAGES_CACHE_DIR)) {
  fs.mkdirSync(PAGES_CACHE_DIR, { recursive: true });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Support large image payloads from computer uploads and sendBeacon text payloads
  app.use(express.json({ limit: '25mb' }));
  app.use(express.text({ type: 'text/plain', limit: '1mb' }));

  // Serve uploaded files and cached catalog pages statically
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/assets/catalog_pages', express.static(PAGES_CACHE_DIR));

  // 1. Get full catalog & current admin status
  app.get('/api/catalog', (_req, res) => {
    res.json({
      catalog: catalogData,
      adminStatus: getAdminStatusPayload(),
    });
  });

  // 1b. Authenticated binary stream for downloading the full PDF inside iframe (avoids mobile cookie interstitial)
  app.get('/api/catalog/pdf', (_req, res) => {
    if (!fs.existsSync(PDF_FILE_PATH)) {
      res.status(404).json({ error: 'Archivo PDF del catálogo no encontrado.' });
      return;
    }
    const stat = fs.statSync(PDF_FILE_PATH);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Catalogo_Shelo_NABEL_2026.pdf"'
    );
    const stream = fs.createReadStream(PDF_FILE_PATH);
    stream.pipe(res);
  });

  // Direct download route for the private PDF Manual (not linked or shown anywhere on the website UI)
  app.get('/Manual_Uso_Shelo_NABEL_2026.pdf', (_req, res) => {
    const manualPath = path.join(__dirname, 'Manual_Uso_Shelo_NABEL_2026.pdf');
    if (!fs.existsSync(manualPath)) {
      res.status(404).send('Manual PDF no encontrado.');
      return;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Manual_Uso_Shelo_NABEL_2026.pdf"'
    );
    fs.createReadStream(manualPath).pipe(res);
  });

  // 1c. On-demand high-resolution page renderer for any of the 148 catalog pages (with pre-rendered fallback for GitHub hosts without Ghostscript)
  app.get('/api/catalog/page/:pageNum', async (req, res) => {
    const pageNum = Math.max(1, Math.min(148, parseInt(req.params.pageNum, 10) || 1));
    const padded = String(pageNum).padStart(3, '0');
    const cachedFile = path.join(PAGES_CACHE_DIR, `pdf_page_${padded}.jpg`);

    try {
      if (!fs.existsSync(cachedFile)) {
        await execFileAsync('gs', [
          '-dNOPAUSE',
          '-dBATCH',
          '-sDEVICE=jpeg',
          '-dJPEGQ=88',
          '-r120',
          `-dFirstPage=${pageNum}`,
          `-dLastPage=${pageNum}`,
          `-sOutputFile=${cachedFile}`,
          PDF_FILE_PATH,
        ]);
      }
      if (fs.existsSync(cachedFile)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        fs.createReadStream(cachedFile).pipe(res);
        return;
      }
    } catch (err) {
      console.warn(`Ghostscript unavailable or failed for page ${pageNum}, using pre-rendered fallback:`, err);
    }

    // Fallback to pre-rendered catalog images in public/assets/catalog/ (pages 1..30)
    const fallbackIndex = ((pageNum - 1) % 30) + 1;
    const fallbackFile = path.join(
      __dirname,
      'public',
      'assets',
      'catalog',
      `page_${String(fallbackIndex).padStart(3, '0')}.jpg`
    );
    if (fs.existsSync(fallbackFile)) {
      res.setHeader('Content-Type', 'image/jpeg');
      fs.createReadStream(fallbackFile).pipe(res);
    } else {
      res.status(404).json({ error: 'Página no disponible.' });
    }
  });

  // 2. Server-Sent Events (SSE) for real-time multi-user sync & instant tab-close detection
  app.get('/api/events', (req, res) => {
    const clientId = (req.query.clientId as string) || crypto.randomUUID();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    clients.set(clientId, { id: clientId, res });

    // Send initial state to newly connected user
    res.write(`event: admin:status\ndata: ${JSON.stringify(getAdminStatusPayload())}\n\n`);
    broadcastAdminStatus();

    req.on('close', () => {
      clients.delete(clientId);
      // If the disconnecting tab/window was the active administrator, immediately close session
      if (activeAdmin && activeAdmin.clientId === clientId) {
        activeAdmin = null;
      }
      broadcastAdminStatus();
    });
  });

  // 3. Admin Login (PIN: 1990) - Enforces single session lock
  app.post('/api/admin/login', (req, res) => {
    cleanupExpiredAdmin();
    const { password, clientId } = req.body || {};

    // Check if an admin is already connected
    if (activeAdmin !== null && activeAdmin.clientId !== clientId) {
      res.status(423).json({
        error: 'Sesión bloqueada: Ya existe un administrador conectado en este momento. No pueden haber dos sesiones de administrador a la vez.',
        adminStatus: getAdminStatusPayload(),
      });
      return;
    }

    if (String(password).trim() !== ADMIN_PIN) {
      res.status(401).json({
        error: 'Clave incorrecta. Intenta nuevamente.',
      });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    activeAdmin = {
      token,
      clientId: clientId || crypto.randomUUID(),
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
    };

    broadcastAdminStatus();
    res.json({
      token,
      adminStatus: getAdminStatusPayload(),
    });
  });

  // 4. Admin Heartbeat (keeps active tab session alive)
  app.post('/api/admin/heartbeat', (req, res) => {
    if (!verifyAdminToken(req)) {
      res.status(401).json({
        error: 'Sesión administrativa expirada o cerrada.',
        adminStatus: getAdminStatusPayload(),
      });
      return;
    }
    res.json({ ok: true, adminStatus: getAdminStatusPayload() });
  });

  // 5. Admin Logout (Supports both button click and window close navigator.sendBeacon)
  app.post('/api/admin/logout', (req, res) => {
    let tokenToClose = '';
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        tokenToClose = parsed.token || '';
      } catch {
        tokenToClose = '';
      }
    } else if (req.body && typeof req.body === 'object') {
      tokenToClose = req.body.token || '';
    }

    const authHeader = req.headers.authorization;
    if (!tokenToClose && authHeader && authHeader.startsWith('Bearer ')) {
      tokenToClose = authHeader.slice(7).trim();
    }

    if (activeAdmin && tokenToClose && activeAdmin.token === tokenToClose) {
      activeAdmin = null;
      broadcastAdminStatus();
    }

    res.json({ ok: true, adminStatus: getAdminStatusPayload() });
  });

  // 6. Upload Image from Computer (converts base64 file upload to static file in /uploads)
  app.post('/api/admin/upload-image', (req, res) => {
    if (!verifyAdminToken(req)) {
      res.status(401).json({ error: 'No autorizado. Inicia sesión como administrador.' });
      return;
    }

    const { dataUrl, fileName } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Imagen no válida.' });
      return;
    }

    try {
      const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!matches) {
        res.status(400).json({ error: 'Formato de imagen no soportado.' });
        return;
      }

      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1].replace(/[^a-z0-9]/gi, '');
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      const safeName = (fileName || 'imagen')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 32);
      const finalFileName = `${safeName}_${Date.now()}.${ext || 'jpg'}`;
      const filePath = path.join(UPLOADS_DIR, finalFileName);

      fs.writeFileSync(filePath, buffer);
      const publicUrl = `/uploads/${finalFileName}`;
      res.json({ imageUrl: publicUrl });
    } catch (err) {
      console.error('Error saving uploaded image:', err);
      res.status(500).json({ error: 'No se pudo guardar la imagen en el servidor.' });
    }
  });

  // 7. Update Product (Price, Image URL / Uploaded Image, Name, Description, Category)
  app.put('/api/admin/products/:id', (req, res) => {
    if (!verifyAdminToken(req)) {
      res.status(401).json({ error: 'No autorizado. Inicia sesión como administrador.' });
      return;
    }

    const { id } = req.params;
    const updates = req.body || {};
    const productIndex = catalogData.products.findIndex((p) => p.id === id);

    if (productIndex === -1) {
      res.status(404).json({ error: 'Producto no encontrado.' });
      return;
    }

    const current = catalogData.products[productIndex];
    const updatedProduct: Product = {
      ...current,
      name: updates.name !== undefined ? String(updates.name).trim() : current.name,
      clave: updates.clave !== undefined ? String(updates.clave).trim() : current.clave,
      subtitle: updates.subtitle !== undefined ? String(updates.subtitle).trim() : current.subtitle,
      description:
        updates.description !== undefined ? String(updates.description).trim() : current.description,
      presentation:
        updates.presentation !== undefined
          ? String(updates.presentation).trim()
          : current.presentation,
      price:
        updates.price !== undefined && !Number.isNaN(Number(updates.price))
          ? Math.max(0, Number(updates.price))
          : current.price,
      imageUrl: updates.imageUrl !== undefined ? String(updates.imageUrl).trim() : current.imageUrl,
      categoryId:
        updates.categoryId !== undefined ? String(updates.categoryId) : current.categoryId,
      catalogPage:
        updates.catalogPage !== undefined
          ? String(updates.catalogPage).trim()
          : current.catalogPage,
    };

    catalogData.products[productIndex] = updatedProduct;
    saveCatalog(catalogData);
    broadcastEvent('catalog:updated', catalogData);

    res.json({ product: updatedProduct, catalog: catalogData });
  });

  // 8. Add New Product to Catalog
  app.post('/api/admin/products', (req, res) => {
    if (!verifyAdminToken(req)) {
      res.status(401).json({ error: 'No autorizado. Inicia sesión como administrador.' });
      return;
    }

    const body = req.body || {};
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      clave: String(body.clave || 'SN2026').trim(),
      name: String(body.name || 'Nuevo Producto Sheló NABEL').trim(),
      subtitle: String(body.subtitle || 'Calidad Natural Sheló NABEL').trim(),
      description: String(body.description || 'Producto oficial del catálogo Sheló NABEL 2026.').trim(),
      presentation: String(body.presentation || '1 pza').trim(),
      price: Math.max(0, Number(body.price) || 199),
      categoryId: String(body.categoryId || catalogData.categories[0].id),
      catalogPage: String(body.catalogPage || '01').trim(),
      imageUrl: String(body.imageUrl || '/assets/catalog/page_003.jpg').trim(),
      featured: Boolean(body.featured),
      priceTagStyle: 'blue',
    };

    catalogData.products.unshift(newProduct);
    saveCatalog(catalogData);
    broadcastEvent('catalog:updated', catalogData);

    res.json({ product: newProduct, catalog: catalogData });
  });

  // 9. Delete Product
  app.delete('/api/admin/products/:id', (req, res) => {
    if (!verifyAdminToken(req)) {
      res.status(401).json({ error: 'No autorizado.' });
      return;
    }

    const { id } = req.params;
    catalogData.products = catalogData.products.filter((p) => p.id !== id);
    saveCatalog(catalogData);
    broadcastEvent('catalog:updated', catalogData);

    res.json({ catalog: catalogData });
  });

  // 10. Update Category in WA0027 Menu (Image URL / Uploaded Image, Name, Description)
  app.put('/api/admin/categories/:id', (req, res) => {
    if (!verifyAdminToken(req)) {
      res.status(401).json({ error: 'No autorizado.' });
      return;
    }

    const { id } = req.params;
    const updates = req.body || {};
    const catIndex = catalogData.categories.findIndex((c) => c.id === id);

    if (catIndex === -1) {
      res.status(404).json({ error: 'Categoría no encontrada.' });
      return;
    }

    const current = catalogData.categories[catIndex];
    catalogData.categories[catIndex] = {
      ...current,
      name: updates.name !== undefined ? String(updates.name).trim() : current.name,
      imageUrl: updates.imageUrl !== undefined ? String(updates.imageUrl).trim() : current.imageUrl,
      description:
        updates.description !== undefined ? String(updates.description).trim() : current.description,
      pageNumber:
        updates.pageNumber !== undefined ? String(updates.pageNumber).trim() : current.pageNumber,
      color: updates.color !== undefined ? String(updates.color).trim() : current.color,
    };

    saveCatalog(catalogData);
    broadcastEvent('catalog:updated', catalogData);
    res.json({ catalog: catalogData });
  });

  // Vite middleware for development / static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sheló NABEL Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
