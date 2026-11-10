import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_CATALOG_DATA } from './src/data/initialCatalog.ts';
import { BETTERWARE_CATALOG_DATA } from './src/data/betterwareCatalog.ts';
import { INITIAL_PROMOTIONS } from './src/data/initialPromotions.ts';
import { CatalogData, Product, PromotionItem } from './src/types.ts';
import { supabaseProjectUrl } from './src/lib/supabaseClient.ts';
import {
  CATALOG_PDF_STORAGE_PATH,
  BETTERWARE_CATALOG_PDF_STORAGE_PATH,
} from './src/lib/supabaseCatalog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const BETTERWARE_CATALOG_FILE = path.join(DATA_DIR, 'betterware_catalog.json');
const PROMOTIONS_FILE = path.join(DATA_DIR, 'promotions.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Ensure directories exist
for (const dir of [DATA_DIR, UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Atomic JSON file write to prevent partial writes or file corruption.
 */
function writeJsonAtomic(filePath: string, data: unknown): void {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      // Ignore cleanup error
    }
  }
}

function loadCatalog(): CatalogData {
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      const raw = fs.readFileSync(CATALOG_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as CatalogData;
      if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.categories)) {
        const deletedSet = new Set(
          Array.isArray(parsed.deletedClaves)
            ? parsed.deletedClaves.map((c) => String(c).trim().toLowerCase())
            : []
        );
        parsed.deletedClaves = Array.from(deletedSet);

        const existingClaves = new Set(
          parsed.products.map((p) => String(p.clave).trim().toLowerCase())
        );
        let modified = false;

        // Ensure all seed categories exist
        const existingCatIds = new Set(parsed.categories.map((c) => c.id));
        for (const seedCat of INITIAL_CATALOG_DATA.categories) {
          if (!existingCatIds.has(seedCat.id)) {
            parsed.categories.push(structuredClone(seedCat));
            modified = true;
          }
        }

        // Non-destructively ensure seed products exist unless explicitly deleted by admin
        for (const seedProd of INITIAL_CATALOG_DATA.products) {
          const normClave = String(seedProd.clave).trim().toLowerCase();
          if (!existingClaves.has(normClave) && !deletedSet.has(normClave)) {
            parsed.products.push(structuredClone(seedProd));
            modified = true;
          }
        }

        if (modified) {
          writeJsonAtomic(CATALOG_FILE, parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading catalog.json, using initial seed:', err);
  }
  const initialClone: CatalogData = {
    ...structuredClone(INITIAL_CATALOG_DATA),
    deletedClaves: [],
  };
  writeJsonAtomic(CATALOG_FILE, initialClone);
  return initialClone;
}

function saveCatalog(data: CatalogData): void {
  data.lastUpdated = new Date().toISOString();
  writeJsonAtomic(CATALOG_FILE, data);
}

function getInitialBetterwareCatalog(): CatalogData {
  return {
    categories: structuredClone(BETTERWARE_CATALOG_DATA.categories),
    products: structuredClone(BETTERWARE_CATALOG_DATA.products) as unknown as Product[],
    whatsappNumber: INITIAL_CATALOG_DATA.whatsappNumber,
    distributorName: INITIAL_CATALOG_DATA.distributorName,
    distributorLocation: INITIAL_CATALOG_DATA.distributorLocation,
    lastUpdated: new Date().toISOString(),
    deletedClaves: [],
  };
}

function loadBetterwareCatalog(): CatalogData {
  const initialBw = getInitialBetterwareCatalog();
  try {
    if (fs.existsSync(BETTERWARE_CATALOG_FILE)) {
      const raw = fs.readFileSync(BETTERWARE_CATALOG_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as CatalogData;
      if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.categories)) {
        const deletedSet = new Set(
          Array.isArray(parsed.deletedClaves)
            ? parsed.deletedClaves.map((c) => String(c).trim().toLowerCase())
            : []
        );
        parsed.deletedClaves = Array.from(deletedSet);

        const existingClaves = new Set(
          parsed.products.map((p) => String(p.clave).trim().toLowerCase())
        );
        let modified = false;

        // Ensure all 11 Betterware categories exist
        const existingCatIds = new Set(parsed.categories.map((c) => c.id));
        for (const seedCat of initialBw.categories) {
          if (!existingCatIds.has(seedCat.id)) {
            parsed.categories.push(structuredClone(seedCat));
            modified = true;
          }
        }

        // Non-destructively ensure all 50 seed products exist unless explicitly deleted by admin
        for (const seedProd of initialBw.products) {
          const normClave = String(seedProd.clave).trim().toLowerCase();
          if (!existingClaves.has(normClave) && !deletedSet.has(normClave)) {
            parsed.products.push(structuredClone(seedProd));
            modified = true;
          }
        }

        if (modified) {
          writeJsonAtomic(BETTERWARE_CATALOG_FILE, parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading betterware_catalog.json, using initial seed:', err);
  }
  writeJsonAtomic(BETTERWARE_CATALOG_FILE, initialBw);
  return initialBw;
}

function saveBetterwareCatalog(data: CatalogData): void {
  data.lastUpdated = new Date().toISOString();
  writeJsonAtomic(BETTERWARE_CATALOG_FILE, data);
}

function loadPromotions(): PromotionItem[] {
  try {
    if (fs.existsSync(PROMOTIONS_FILE)) {
      const raw = fs.readFileSync(PROMOTIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as PromotionItem[];
      }
    }
  } catch (err) {
    console.error('Error reading promotions.json, using initial seed:', err);
  }
  const initialPromos = structuredClone(INITIAL_PROMOTIONS);
  writeJsonAtomic(PROMOTIONS_FILE, initialPromos);
  return initialPromos;
}

function savePromotions(items: PromotionItem[]): void {
  writeJsonAtomic(PROMOTIONS_FILE, items);
}

let catalogData: CatalogData = loadCatalog();
let betterwareCatalogData: CatalogData = loadBetterwareCatalog();
let promotionsData: PromotionItem[] = loadPromotions();

/**
 * Finds a product index by exact ID, normalized clave from ID (e.g. prod-s1701 or bw-26625), or explicit clave.
 */
function findProductIndex(
  products: Product[],
  idParam: string,
  explicitClave?: string
): number {
  const cleanId = String(idParam || '').trim();
  if (!cleanId) return -1;

  // 1. Direct ID match
  const exactIdx = products.findIndex((p) => p.id === cleanId);
  if (exactIdx !== -1) return exactIdx;

  // 2. Match by clave extracted from ID (e.g. "prod-s1701" -> "s1701", "bw-26625" -> "26625")
  const strippedIdClave = cleanId.replace(/^(bw-prod-|bw-|prod-)/i, '').trim().toLowerCase();
  if (strippedIdClave) {
    const byStrippedIdx = products.findIndex(
      (p) => String(p.clave).trim().toLowerCase() === strippedIdClave
    );
    if (byStrippedIdx !== -1) return byStrippedIdx;
  }

  // 3. Match by explicit clave if provided in body/query
  if (explicitClave) {
    const normExplicit = String(explicitClave).trim().toLowerCase();
    if (normExplicit) {
      const byClaveIdx = products.findIndex(
        (p) => String(p.clave).trim().toLowerCase() === normExplicit
      );
      if (byClaveIdx !== -1) return byClaveIdx;
    }
  }

  return -1;
}

/**
 * Streams a static file safely with HEAD request optimization, error handling, and descriptor cleanup.
 */
function streamFileSafely(
  req: express.Request,
  res: express.Response,
  filePath: string,
  options: {
    contentType: string;
    downloadFilename?: string;
    cacheControl?: string;
  }
): void {
  try {
    if (!fs.existsSync(filePath)) {
      if (!res.headersSent) {
        res.status(404).json({ error: 'Archivo solicitado no encontrado.' });
      }
      return;
    }

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', options.contentType);
    res.setHeader('Content-Length', String(stat.size));
    if (options.downloadFilename) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${options.downloadFilename}"`
      );
    }
    if (options.cacheControl) {
      res.setHeader('Cache-Control', options.cacheControl);
    }

    if (req.method === 'HEAD') {
      res.status(200).end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error(`Stream error reading ${filePath}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al leer el archivo en el servidor.' });
      } else {
        res.destroy();
      }
    });

    req.on('close', () => {
      if (!stream.destroyed) {
        stream.destroy();
      }
    });

    stream.pipe(res);
  } catch (err) {
    console.error(`Unexpected error serving file ${filePath}:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo procesar el archivo.' });
    }
  }
}

// Single Active Admin Session State (Server-Authoritative)
const ADMIN_PIN = (process.env.ADMIN_PIN || '1990').trim();
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

// Periodic check for stale admin sessions & SSE keep-alive heartbeat
setInterval(() => {
  if (cleanupExpiredAdmin()) {
    broadcastAdminStatus();
  }
}, 3000);

setInterval(() => {
  for (const [id, client] of clients.entries()) {
    try {
      client.res.write(': keepalive\n\n');
    } catch {
      clients.delete(id);
    }
  }
}, 20000);

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
const BETTERWARE_PDF_PATH = path.join(
  __dirname,
  'public',
  'assets',
  'aistudio',
  'Cat_logo_Noviembre_2026_261026_211026_21b3198a.pdf'
);
const PAGES_CACHE_DIR = path.join(__dirname, 'public', 'assets', 'catalog_pages');
const BETTERWARE_PAGES_DIR = path.join(__dirname, 'public', 'assets', 'betterware');
for (const dir of [PAGES_CACHE_DIR, BETTERWARE_PAGES_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getBaseSupabaseUrl(): string {
  return (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    supabaseProjectUrl ||
    ''
  )
    .trim()
    .replace(/\/+$/, '');
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

  // Healthcheck endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      sheloProducts: catalogData.products.length,
      sheloCategories: catalogData.categories.length,
      betterwareProducts: betterwareCatalogData.products.length,
      betterwareCategories: betterwareCatalogData.categories.length,
      promotionsCount: promotionsData.length,
      adminPinConfigured: Boolean(ADMIN_PIN),
    });
  });

  // 1. Get full catalog (Sheló NABEL, Betterware & Promotions) & current admin status
  app.get('/api/catalog', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      catalog: catalogData,
      betterwareCatalog: betterwareCatalogData,
      promotions: promotionsData,
      adminStatus: getAdminStatusPayload(),
    });
  });

  // 1a. Download or inspect complete SQL structure & seed for all 3 sections (Sheló + Betterware + Promociones)
  app.get('/api/admin/sql/full-setup', (_req, res) => {
    try {
      const schemaPath = path.join(__dirname, 'supabase', 'schema.sql');
      const seedPath = path.join(__dirname, 'supabase', 'seed_products.sql');
      const schemaSql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf-8') : '';
      const seedSql = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, 'utf-8') : '';
      const combined = `${schemaSql}\n\n${seedSql}`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Supabase_Completo_Shelo_Betterware_Promociones_2026.sql"'
      );
      res.send(combined);
    } catch (err) {
      console.error('Error serving SQL bundle:', err);
      res.status(500).json({ error: 'No se pudo generar el archivo SQL completo.' });
    }
  });

  // 1b. Download full Sheló NABEL catalog PDF: redirect (302) to public Supabase Storage if uploaded, otherwise stream local fallback
  app.get('/api/catalog/pdf', async (req, res) => {
    const preferLocal = req.query.source === 'local';
    if (preferLocal && fs.existsSync(PDF_FILE_PATH)) {
      streamFileSafely(req, res, PDF_FILE_PATH, {
        contentType: 'application/pdf',
        downloadFilename: 'Catalogo_Shelo_NABEL_2026.pdf',
      });
      return;
    }

    const baseSupabaseUrl = getBaseSupabaseUrl();
    if (baseSupabaseUrl.startsWith('https://') || baseSupabaseUrl.startsWith('http://')) {
      const publicStoragePdfUrl = `${baseSupabaseUrl}/storage/v1/object/public/product-images/${CATALOG_PDF_STORAGE_PATH}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      try {
        const headRes = await fetch(publicStoragePdfUrl, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
        });
        if (headRes.status === 200) {
          res.redirect(302, publicStoragePdfUrl);
          return;
        }
      } catch {
        // Ignore network/timeout errors and fall back to local PDF file
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!fs.existsSync(PDF_FILE_PATH)) {
      res.status(404).json({
        error:
          'Archivo PDF del catálogo Sheló NABEL no encontrado en Supabase Storage ni en el servidor local. Súbelo desde el Panel Admin con tu sesión de Supabase activa.',
      });
      return;
    }

    streamFileSafely(req, res, PDF_FILE_PATH, {
      contentType: 'application/pdf',
      downloadFilename: 'Catalogo_Shelo_NABEL_2026.pdf',
    });
  });

  // 1b-2. Download Betterware Catalog PDF: redirect (302) to public Supabase Storage if uploaded, otherwise stream local fallback
  app.get('/api/catalog/betterware/pdf', async (req, res) => {
    const preferLocal = req.query.source === 'local';
    if (preferLocal && fs.existsSync(BETTERWARE_PDF_PATH)) {
      streamFileSafely(req, res, BETTERWARE_PDF_PATH, {
        contentType: 'application/pdf',
        downloadFilename: 'Catalogo_Betterware_Noviembre_2026.pdf',
      });
      return;
    }

    const baseSupabaseUrl = getBaseSupabaseUrl();
    if (baseSupabaseUrl.startsWith('https://') || baseSupabaseUrl.startsWith('http://')) {
      const publicStoragePdfUrl = `${baseSupabaseUrl}/storage/v1/object/public/product-images/${BETTERWARE_CATALOG_PDF_STORAGE_PATH}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      try {
        const headRes = await fetch(publicStoragePdfUrl, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
        });
        if (headRes.status === 200) {
          res.redirect(302, publicStoragePdfUrl);
          return;
        }
      } catch {
        // Ignore network/timeout errors and fall back to local PDF file
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!fs.existsSync(BETTERWARE_PDF_PATH)) {
      res.status(404).json({
        error: 'Archivo PDF del catálogo Betterware no encontrado.',
      });
      return;
    }

    streamFileSafely(req, res, BETTERWARE_PDF_PATH, {
      contentType: 'application/pdf',
      downloadFilename: 'Catalogo_Betterware_Noviembre_2026.pdf',
    });
  });

  // 1b-3. High-resolution page renderer for Betterware catalog (118 pages)
  app.get('/api/catalog/betterware/page/:pageNum', async (req, res) => {
    const pageNum = Math.max(1, Math.min(118, parseInt(req.params.pageNum, 10) || 1));
    const padded = String(pageNum).padStart(3, '0');
    const imagePath = path.join(BETTERWARE_PAGES_DIR, `page_${padded}.jpg`);

    if (fs.existsSync(imagePath)) {
      streamFileSafely(req, res, imagePath, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=86400',
      });
      return;
    }

    const bwCacheDir = path.join(PAGES_CACHE_DIR, 'betterware');
    const cachedBwPath = path.join(bwCacheDir, `page_${padded}.jpg`);
    if (fs.existsSync(cachedBwPath)) {
      streamFileSafely(req, res, cachedBwPath, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=86400',
      });
      return;
    }

    // Render on-demand from Betterware PDF if available locally
    try {
      if (fs.existsSync(BETTERWARE_PDF_PATH)) {
        if (!fs.existsSync(bwCacheDir)) {
          fs.mkdirSync(bwCacheDir, { recursive: true });
        }
        await execFileAsync('gs', [
          '-dNOPAUSE',
          '-dBATCH',
          '-sDEVICE=jpeg',
          '-dJPEGQ=80',
          '-r110',
          `-dFirstPage=${pageNum}`,
          `-dLastPage=${pageNum}`,
          `-sOutputFile=${cachedBwPath}`,
          BETTERWARE_PDF_PATH,
        ]);
        if (fs.existsSync(cachedBwPath)) {
          streamFileSafely(req, res, cachedBwPath, {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=86400',
          });
          return;
        }
      }
    } catch {
      // Fallback to page 1 below
    }

    // Fallback to page 1 if specific page file is missing
    const fallbackPath = path.join(BETTERWARE_PAGES_DIR, 'page_001.jpg');
    if (fs.existsSync(fallbackPath)) {
      streamFileSafely(req, res, fallbackPath, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=3600',
      });
      return;
    }

    res.status(404).json({ error: 'Página de Betterware no encontrada.' });
  });

  // Direct download route for the private PDF Manual
  app.get('/Manual_Uso_Shelo_NABEL_2026.pdf', (req, res) => {
    const manualFileCandidates = [
      path.join(__dirname, 'Manual_Uso_Shelo_NABEL_2026.pdf'),
      path.join(__dirname, 'public', 'Manual_Uso_Shelo_NABEL_2026.pdf'),
    ];
    const manualPath = manualFileCandidates.find((p) => fs.existsSync(p));
    if (!manualPath) {
      res.status(404).json({ error: 'Manual PDF no encontrado.' });
      return;
    }
    streamFileSafely(req, res, manualPath, {
      contentType: 'application/pdf',
      downloadFilename: 'Manual_Uso_Shelo_NABEL_2026.pdf',
    });
  });

  // 1c. On-demand high-resolution page renderer for any of the 148 Sheló NABEL catalog pages
  app.get('/api/catalog/page/:pageNum', async (req, res) => {
    const pageNum = Math.max(1, Math.min(148, parseInt(req.params.pageNum, 10) || 1));
    const padded = String(pageNum).padStart(3, '0');
    const cachedFile = path.join(PAGES_CACHE_DIR, `pdf_page_${padded}.jpg`);

    try {
      if (!fs.existsSync(cachedFile) && fs.existsSync(PDF_FILE_PATH)) {
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
        streamFileSafely(req, res, cachedFile, {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=86400',
        });
        return;
      }
    } catch (err) {
      console.warn(
        `Ghostscript unavailable or failed for page ${pageNum}, using pre-rendered fallback:`,
        err instanceof Error ? err.message : err
      );
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
      streamFileSafely(req, res, fallbackFile, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=86400',
      });
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
    res.setHeader('X-Accel-Buffering', 'no');
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

  // 3. Admin Login - Enforces single session lock across Sheló NABEL, Betterware & Promociones
  app.post('/api/admin/login', (req, res) => {
    cleanupExpiredAdmin();
    const configuredPin = (process.env.ADMIN_PIN || ADMIN_PIN).trim();

    const { password, clientId } = req.body || {};

    // Check if an admin is already connected
    if (activeAdmin !== null && activeAdmin.clientId !== clientId) {
      res.status(423).json({
        error:
          'Sesión bloqueada: Ya existe un administrador conectado en este momento. No pueden haber dos sesiones de administrador a la vez.',
        adminStatus: getAdminStatusPayload(),
      });
      return;
    }

    const submittedPassword = String(password ?? '').trim();
    if (!submittedPassword || submittedPassword !== configuredPin) {
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
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 32);
      const finalFileName = `${safeName || 'imagen'}_${Date.now()}.${ext || 'jpg'}`;
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
    const hintClave = updates.clave ? String(updates.clave).trim() : undefined;

    const sheloIndex = findProductIndex(catalogData.products, id, hintClave);
    const bwIndex = findProductIndex(betterwareCatalogData.products, id, hintClave);

    if (sheloIndex === -1 && bwIndex === -1) {
      res.status(404).json({ error: 'Producto no encontrado.' });
      return;
    }

    const foundInBw = bwIndex !== -1 && (updates.brand === 'betterware' || sheloIndex === -1);
    const sourceCatalog = foundInBw ? betterwareCatalogData : catalogData;
    const sourceIndex = foundInBw ? bwIndex : sheloIndex;
    const current = sourceCatalog.products[sourceIndex];

    const targetBrand: 'shelo' | 'betterware' =
      updates.brand === 'betterware' ||
      (updates.brand === undefined &&
        (foundInBw || String(updates.categoryId || current.categoryId).startsWith('bw-')))
        ? 'betterware'
        : 'shelo';

    const nextOriginalPrice =
      updates.originalPrice !== undefined
        ? updates.originalPrice === null || updates.originalPrice === ''
          ? undefined
          : Math.max(0, Number(updates.originalPrice))
        : current.originalPrice;

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
      ...(nextOriginalPrice !== undefined ? { originalPrice: nextOriginalPrice } : {}),
      imageUrl: updates.imageUrl !== undefined ? String(updates.imageUrl).trim() : current.imageUrl,
      categoryId:
        updates.categoryId !== undefined ? String(updates.categoryId).trim() : current.categoryId,
      catalogPage:
        updates.catalogPage !== undefined
          ? String(updates.catalogPage).trim()
          : current.catalogPage,
      brand: targetBrand,
      priceTagStyle:
        updates.priceTagStyle || current.priceTagStyle || (targetBrand === 'betterware' ? 'rose' : 'blue'),
    };

    const movedAcrossBrands =
      (foundInBw && targetBrand === 'shelo') || (!foundInBw && targetBrand === 'betterware');

    if (movedAcrossBrands) {
      sourceCatalog.products.splice(sourceIndex, 1);
      const destinationCatalog =
        targetBrand === 'betterware' ? betterwareCatalogData : catalogData;
      destinationCatalog.products.unshift(updatedProduct);
      saveCatalog(catalogData);
      saveBetterwareCatalog(betterwareCatalogData);
      broadcastEvent('catalog:updated', catalogData);
      broadcastEvent('betterware:updated', betterwareCatalogData);
    } else if (foundInBw) {
      betterwareCatalogData.products[sourceIndex] = updatedProduct;
      saveBetterwareCatalog(betterwareCatalogData);
      broadcastEvent('betterware:updated', betterwareCatalogData);
    } else {
      catalogData.products[sourceIndex] = updatedProduct;
      saveCatalog(catalogData);
      broadcastEvent('catalog:updated', catalogData);
    }

    res.json({
      product: updatedProduct,
      catalog: catalogData,
      betterwareCatalog: betterwareCatalogData,
    });
  });

  // 8. Add New Product to Catalog (Upserts by clave if clave already exists)
  app.post('/api/admin/products', (req, res) => {
    if (!verifyAdminToken(req)) {
      res.status(401).json({ error: 'No autorizado. Inicia sesión como administrador.' });
      return;
    }

    const body = req.body || {};
    const isBw = body.brand === 'betterware' || String(body.categoryId || '').startsWith('bw-');
    const targetCatalog = isBw ? betterwareCatalogData : catalogData;
    const cleanClave = String(body.clave || (isBw ? '26999' : 'SN2026')).trim();
    const normClave = cleanClave.toLowerCase();

    const existingIdx = targetCatalog.products.findIndex(
      (p) => String(p.clave).trim().toLowerCase() === normClave
    );

    const defaultCategoryId =
      targetCatalog.categories[0]?.id || (isBw ? 'bw-navidad' : 'lo-nuevo-en-casa');

    const newProduct: Product = {
      id:
        existingIdx !== -1
          ? targetCatalog.products[existingIdx].id
          : `${isBw ? 'bw' : 'prod'}-${normClave}-${Date.now().toString(36)}`,
      clave: cleanClave,
      name: String(
        body.name || (isBw ? 'Nuevo Producto Betterware' : 'Nuevo Producto Sheló NABEL')
      ).trim(),
      subtitle: String(
        body.subtitle || (isBw ? 'Soluciones Prácticas para tu Hogar' : 'Calidad Natural Sheló NABEL')
      ).trim(),
      description: String(
        body.description ||
          (isBw
            ? 'Producto oficial del catálogo Betterware Noviembre 2026.'
            : 'Producto oficial del catálogo Sheló NABEL 2026.')
      ).trim(),
      presentation: String(body.presentation || (isBw ? '1 pza' : '250 ml')).trim(),
      price: Math.max(0, Number(body.price) || 199),
      ...(body.originalPrice !== undefined && Number(body.originalPrice) > 0
        ? { originalPrice: Number(body.originalPrice) }
        : {}),
      categoryId: String(body.categoryId || defaultCategoryId).trim(),
      catalogPage: String(body.catalogPage || '01').trim(),
      imageUrl: String(
        body.imageUrl || (isBw ? '/assets/betterware/page_001.jpg' : '/assets/catalog/page_003.jpg')
      ).trim(),
      featured: Boolean(body.featured),
      brand: isBw ? 'betterware' : 'shelo',
      priceTagStyle: isBw ? 'rose' : 'blue',
    };

    // If this clave was previously marked as deleted, unmark it
    if (Array.isArray(targetCatalog.deletedClaves)) {
      targetCatalog.deletedClaves = targetCatalog.deletedClaves.filter(
        (c) => String(c).trim().toLowerCase() !== normClave
      );
    }

    if (existingIdx !== -1) {
      targetCatalog.products[existingIdx] = newProduct;
    } else {
      targetCatalog.products.unshift(newProduct);
    }

    if (isBw) {
      saveBetterwareCatalog(betterwareCatalogData);
      broadcastEvent('betterware:updated', betterwareCatalogData);
    } else {
      saveCatalog(catalogData);
      broadcastEvent('catalog:updated', catalogData);
    }

    res.json({
      product: newProduct,
      catalog: catalogData,
      betterwareCatalog: betterwareCatalogData,
    });
  });

  // 9. Delete Product (Matches by ID or clave and records deletion so seed reload doesn't resurrect it)
  app.delete('/api/admin/products/:id', (req, res) => {
    if (!verifyAdminToken(req)) {
      res.status(401).json({ error: 'No autorizado.' });
      return;
    }

    const { id } = req.params;
    const queryClave = typeof req.query.clave === 'string' ? req.query.clave : undefined;

    const bwIdx = findProductIndex(betterwareCatalogData.products, id, queryClave);
    const sheloIdx = findProductIndex(catalogData.products, id, queryClave);

    if (bwIdx === -1 && sheloIdx === -1) {
      res.status(404).json({ error: 'Producto no encontrado para eliminar.' });
      return;
    }

    if (bwIdx !== -1) {
      const removed = betterwareCatalogData.products[bwIdx];
      betterwareCatalogData.products.splice(bwIdx, 1);
      const normClave = String(removed.clave).trim().toLowerCase();
      const deletedSet = new Set(betterwareCatalogData.deletedClaves || []);
      deletedSet.add(normClave);
      betterwareCatalogData.deletedClaves = Array.from(deletedSet);

      saveBetterwareCatalog(betterwareCatalogData);
      broadcastEvent('betterware:updated', betterwareCatalogData);
    } else if (sheloIdx !== -1) {
      const removed = catalogData.products[sheloIdx];
      catalogData.products.splice(sheloIdx, 1);
      const normClave = String(removed.clave).trim().toLowerCase();
      const deletedSet = new Set(catalogData.deletedClaves || []);
      deletedSet.add(normClave);
      catalogData.deletedClaves = Array.from(deletedSet);

      saveCatalog(catalogData);
      broadcastEvent('catalog:updated', catalogData);
    }

    res.json({
      catalog: catalogData,
      betterwareCatalog: betterwareCatalogData,
    });
  });

  // 10. Update Category in Menu (Image URL / Uploaded Image, Name, Description)
  app.put('/api/admin/categories/:id', (req, res) => {
    if (!verifyAdminToken(req)) {
      res.status(401).json({ error: 'No autorizado.' });
      return;
    }

    const { id } = req.params;
    const updates = req.body || {};
    const sheloCatIdx = catalogData.categories.findIndex((c) => c.id === id);
    const bwCatIdx = betterwareCatalogData.categories.findIndex((c) => c.id === id);

    if (sheloCatIdx === -1 && bwCatIdx === -1) {
      res.status(404).json({ error: 'Categoría no encontrada.' });
      return;
    }

    const isBw = bwCatIdx !== -1;
    const targetCatalog = isBw ? betterwareCatalogData : catalogData;
    const targetIdx = isBw ? bwCatIdx : sheloCatIdx;
    const current = targetCatalog.categories[targetIdx];

    const parsedPdfPage =
      updates.pageNumber !== undefined
        ? parseInt(String(updates.pageNumber).replace(/\D/g, ''), 10)
        : current.pdfPage;

    targetCatalog.categories[targetIdx] = {
      ...current,
      name: updates.name !== undefined ? String(updates.name).trim() : current.name,
      imageUrl: updates.imageUrl !== undefined ? String(updates.imageUrl).trim() : current.imageUrl,
      description:
        updates.description !== undefined ? String(updates.description).trim() : current.description,
      pageNumber:
        updates.pageNumber !== undefined ? String(updates.pageNumber).trim() : current.pageNumber,
      pdfPage: !Number.isNaN(parsedPdfPage) && parsedPdfPage > 0 ? parsedPdfPage : current.pdfPage,
      color: updates.color !== undefined ? String(updates.color).trim() : current.color,
    };

    if (isBw) {
      saveBetterwareCatalog(betterwareCatalogData);
      broadcastEvent('betterware:updated', betterwareCatalogData);
    } else {
      saveCatalog(catalogData);
      broadcastEvent('catalog:updated', catalogData);
    }

    res.json({
      catalog: catalogData,
      betterwareCatalog: betterwareCatalogData,
    });
  });

  // 11. Update Promotion (Title, Subtitle, Description, Badge, Image URL / Uploaded Image)
  app.put('/api/admin/promotions/:id', (req, res) => {
    if (!verifyAdminToken(req)) {
      res.status(401).json({ error: 'No autorizado. Inicia sesión como administrador.' });
      return;
    }

    const { id } = req.params;
    const updates = req.body || {};
    const cleanId = String(id || '').trim().toLowerCase();
    const idx = promotionsData.findIndex(
      (p) =>
        p.id.toLowerCase() === cleanId ||
        p.clave.toLowerCase() === cleanId ||
        (updates.clave && p.clave.toLowerCase() === String(updates.clave).trim().toLowerCase())
    );

    if (idx === -1) {
      res.status(404).json({ error: 'Promoción no encontrada.' });
      return;
    }

    const current = promotionsData[idx];
    const updatedPromo: PromotionItem = {
      ...current,
      title: updates.title !== undefined ? String(updates.title).trim() : current.title,
      subtitle: updates.subtitle !== undefined ? String(updates.subtitle).trim() : current.subtitle,
      description:
        updates.description !== undefined ? String(updates.description).trim() : current.description,
      badgeText:
        updates.badgeText !== undefined ? String(updates.badgeText).trim() : current.badgeText,
      price:
        updates.price !== undefined && !Number.isNaN(Number(updates.price))
          ? Math.max(0, Number(updates.price))
          : current.price,
      imageUrl: updates.imageUrl !== undefined ? String(updates.imageUrl).trim() : current.imageUrl,
    };

    promotionsData[idx] = updatedPromo;
    savePromotions(promotionsData);
    broadcastEvent('promotions:updated', promotionsData);

    res.json({
      promotion: updatedPromo,
      promotions: promotionsData,
    });
  });

  // 12. Create or Upsert Promotion
  app.post('/api/admin/promotions', (req, res) => {
    if (!verifyAdminToken(req)) {
      res.status(401).json({ error: 'No autorizado.' });
      return;
    }

    const body = req.body || {};
    const nextNum = promotionsData.length + 1;
    const cleanClave = String(body.clave || `PROMO-0${nextNum}`).trim().toUpperCase();
    const newPromo: PromotionItem = {
      id: body.id || cleanClave.toLowerCase(),
      clave: cleanClave,
      title: String(body.title || 'Nueva Promoción Especial').trim(),
      subtitle: String(body.subtitle || 'Yesenia Jiménez · WhatsApp 632 103 7155').trim(),
      description: String(body.description || 'Promoción oficial disponible por WhatsApp.').trim(),
      badgeText: String(body.badgeText || 'PROMOCIÓN ESPECIAL').trim(),
      price: body.price !== undefined ? Math.max(0, Number(body.price)) : 300,
      imageUrl: String(
        body.imageUrl || '/assets/aistudio/IMG-20261108-WA0011_4f8feda1.jpg'
      ).trim(),
    };

    const existingIdx = promotionsData.findIndex(
      (p) => p.clave.toLowerCase() === cleanClave.toLowerCase() || p.id === newPromo.id
    );
    if (existingIdx !== -1) {
      promotionsData[existingIdx] = newPromo;
    } else {
      promotionsData.push(newPromo);
    }

    savePromotions(promotionsData);
    broadcastEvent('promotions:updated', promotionsData);

    res.json({
      promotion: newPromo,
      promotions: promotionsData,
    });
  });

  // 13. Delete Promotion
  app.delete('/api/admin/promotions/:id', (req, res) => {
    if (!verifyAdminToken(req)) {
      res.status(401).json({ error: 'No autorizado.' });
      return;
    }

    const { id } = req.params;
    const cleanId = String(id || '').trim().toLowerCase();
    promotionsData = promotionsData.filter(
      (p) => p.id.toLowerCase() !== cleanId && p.clave.toLowerCase() !== cleanId
    );
    savePromotions(promotionsData);
    broadcastEvent('promotions:updated', promotionsData);

    res.json({
      promotions: promotionsData,
    });
  });

  // Global API error handler so backend errors always return JSON instead of HTML stack traces
  app.use(
    (
      err: Error & { status?: number; type?: string },
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (req.path.startsWith('/api/')) {
        console.error(`API Error on ${req.method} ${req.path}:`, err);
        const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
        const message =
          err.type === 'entity.too.large'
            ? 'El archivo o imagen supera el límite máximo permitido (25 MB).'
            : err.message || 'Error interno del servidor.';
        res.status(status).json({ error: message });
        return;
      }
      next(err);
    }
  );

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
    console.log(`Sheló NABEL & Betterware Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
