import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// In-Memory Server Cache with 60-second TTL (cleared immediately on mutations)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return cached.data as T;
}

function setInCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

// Helper: Convert Buffer to Base64 Data URI
function bufferToDataUri(buffer: Buffer | Uint8Array | null, mimeType: string = 'image/jpeg'): string | null {
  if (!buffer || buffer.length === 0) return null;
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

// Helper: Parse Base64 Data URI to Uint8Array & MimeType
function parseDataUri(dataUri: string | null): { buffer: Uint8Array<ArrayBuffer> | null; mimeType: string } {
  if (!dataUri || !dataUri.startsWith('data:')) {
    return { buffer: null, mimeType: 'image/jpeg' };
  }
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { buffer: null, mimeType: 'image/jpeg' };
  const buf = Buffer.from(match[2], 'base64');
  return {
    mimeType: match[1],
    buffer: new Uint8Array(buf.buffer, buf.byteOffset, buf.length) as unknown as Uint8Array<ArrayBuffer>,
  };
}

// Admin Token Validation
function validateAdmin(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET_TOKEN || 'DrGopi@Clinic#Admin2026!';
  const authHeader = req.headers.get('Authorization') || req.headers.get('X-Admin-Token') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return token === adminSecret;
}

// -----------------------------------------------------------------------------
// GET Handler
// -----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const id = searchParams.get('id') ? parseInt(searchParams.get('id')!, 10) : null;

  try {
    // 1. Ping
    if (action === 'ping') {
      return NextResponse.json({ success: true, status: 'online', database: 'connected' });
    }

    // 2. Dashboard Stats (Cached for 30s)
    if (action === 'stats') {
      const cachedStats = getFromCache('stats');
      if (cachedStats) return NextResponse.json(cachedStats);

      const [prodCount, bookCount, artCount, testAll, testPub] = await Promise.all([
        prisma.product.count(),
        prisma.book.count(),
        prisma.article.count(),
        prisma.testimonial.count(),
        prisma.testimonial.count({ where: { is_published: true } }),
      ]);

      const result = {
        success: true,
        stats: {
          products: prodCount,
          books: bookCount,
          articles: artCount,
          testimonials: {
            total: testAll,
            published: testPub,
            pending: testAll - testPub,
          },
        },
      };
      setInCache('stats', result);
      return NextResponse.json(result);
    }

    // 3. Products
    if (action === 'products') {
      if (id) {
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        return NextResponse.json({
          success: true,
          data: {
            ...product,
            price: Number(product.price),
            image_data: bufferToDataUri(product.image_data, product.image_mime_type || 'image/png'),
          },
        });
      }

      const cachedProducts = getFromCache('products_list');
      if (cachedProducts) return NextResponse.json(cachedProducts);

      const products = await prisma.product.findMany({
        select: {
          id: true,
          title: true,
          category: true,
          price: true,
          description: true,
          image_data: true,
          image_mime_type: true,
          created_at: true,
        },
        orderBy: { id: 'desc' },
      });

      const result = {
        success: true,
        data: products.map((p) => ({
          ...p,
          price: Number(p.price),
          image_data: bufferToDataUri(p.image_data, p.image_mime_type || 'image/png'),
        })),
      };
      setInCache('products_list', result);
      return NextResponse.json(result);
    }

    // 4. Books (CRITICAL OPTIMIZATION: Do NOT pull preview_file_data binary blob on list view)
    if (action === 'books') {
      if (id) {
        const book = await prisma.book.findUnique({ where: { id } });
        if (!book) return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
        return NextResponse.json({
          success: true,
          data: {
            ...book,
            price: Number(book.price),
            cover_image_data: bufferToDataUri(book.cover_image_data, book.cover_mime_type || 'image/png'),
            preview_file_data: null,
          },
        });
      }

      const cachedBooks = getFromCache('books_list');
      if (cachedBooks) return NextResponse.json(cachedBooks);

      // Fast query excluding heavy PDF preview binaries
      const books = await prisma.book.findMany({
        select: {
          id: true,
          title: true,
          price: true,
          summary: true,
          cover_image_data: true,
          cover_mime_type: true,
          created_at: true,
        },
        orderBy: { id: 'desc' },
      });

      const result = {
        success: true,
        data: books.map((b) => ({
          ...b,
          price: Number(b.price),
          cover_image_data: bufferToDataUri(b.cover_image_data, b.cover_mime_type || 'image/png'),
          preview_file_data: null,
        })),
      };
      setInCache('books_list', result);
      return NextResponse.json(result);
    }

    // 5. Articles
    if (action === 'articles') {
      if (id) {
        const article = await prisma.article.findUnique({ where: { id } });
        if (!article) return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
        return NextResponse.json({
          success: true,
          data: {
            ...article,
            thumbnail_data: bufferToDataUri(article.thumbnail_data, article.thumbnail_mime_type || 'image/jpeg'),
          },
        });
      }

      const cachedArticles = getFromCache('articles_list');
      if (cachedArticles) return NextResponse.json(cachedArticles);

      const articles = await prisma.article.findMany({
        select: {
          id: true,
          title: true,
          category: true,
          content: true,
          thumbnail_data: true,
          thumbnail_mime_type: true,
          created_at: true,
        },
        orderBy: { id: 'desc' },
      });

      const result = {
        success: true,
        data: articles.map((a) => ({
          ...a,
          thumbnail_data: bufferToDataUri(a.thumbnail_data, a.thumbnail_mime_type || 'image/jpeg'),
        })),
      };
      setInCache('articles_list', result);
      return NextResponse.json(result);
    }

    // 6. Testimonials
    if (action === 'testimonials') {
      const includeAll = searchParams.get('all') === '1' || validateAdmin(req);
      const cacheKey = includeAll ? 'testimonials_all' : 'testimonials_pub';
      const cachedTestimonials = getFromCache(cacheKey);
      if (cachedTestimonials) return NextResponse.json(cachedTestimonials);

      const where = includeAll ? {} : { is_published: true };
      const testimonials = await prisma.testimonial.findMany({
        where,
        orderBy: { id: 'desc' },
      });

      const result = { success: true, data: testimonials };
      setInCache(cacheKey, result);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Invalid action parameter' }, { status: 400 });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// POST Handler (Mutations: Evicts Cache Immediately)
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const id = searchParams.get('id') ? parseInt(searchParams.get('id')!, 10) : null;
  const toggle = searchParams.get('toggle') === '1';

  try {
    const body = await req.json().catch(() => ({}));

    // 1. Admin Login
    if (action === 'login') {
      const adminSecret = process.env.ADMIN_SECRET_TOKEN || 'DrGopi@Clinic#Admin2026!';
      if (body.passcode === adminSecret) {
        return NextResponse.json({
          success: true,
          token: adminSecret,
          message: 'Authenticated successfully',
        });
      }
      return NextResponse.json({ success: false, error: 'Invalid admin passcode' }, { status: 401 });
    }

    // All further POST operations require Admin Authentication
    if (!validateAdmin(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    // 2. Testimonial Toggle
    if (action === 'testimonials' && (toggle || body.action === 'toggle')) {
      const targetId = id || body.id;
      const current = await prisma.testimonial.findUnique({ where: { id: targetId } });
      if (!current) return NextResponse.json({ success: false, error: 'Testimonial not found' }, { status: 404 });

      const updated = await prisma.testimonial.update({
        where: { id: targetId },
        data: { is_published: !current.is_published },
      });
      clearCache('testimonials');
      clearCache('stats');
      return NextResponse.json({ success: true, data: updated });
    }

    // 3. Create Product
    if (action === 'products') {
      if (!body.title || !body.title.trim()) {
        return NextResponse.json({ success: false, error: 'Product title is required' }, { status: 400 });
      }
      if (body.price === undefined || isNaN(parseFloat(body.price)) || parseFloat(body.price) <= 0) {
        return NextResponse.json({ success: false, error: 'Valid product price greater than ₹0 is required' }, { status: 400 });
      }
      if (!body.description || !body.description.trim()) {
        return NextResponse.json({ success: false, error: 'Product description is required' }, { status: 400 });
      }
      if (!body.image_data) {
        return NextResponse.json({ success: false, error: 'Product photo is required' }, { status: 400 });
      }
      const { buffer, mimeType } = parseDataUri(body.image_data);
      const product = await prisma.product.create({
        data: {
          title: body.title.trim(),
          category: body.category || 'General',
          price: parseFloat(body.price),
          description: body.description.trim(),
          image_data: buffer,
          image_mime_type: mimeType,
        },
      });
      clearCache('products');
      clearCache('stats');
      return NextResponse.json({
        success: true,
        data: {
          ...product,
          price: Number(product.price),
          image_data: bufferToDataUri(product.image_data, product.image_mime_type || 'image/png'),
        },
      });
    }

    // 4. Create Book (Without PDF upload)
    if (action === 'books') {
      if (!body.title || !body.title.trim()) {
        return NextResponse.json({ success: false, error: 'Book title is required' }, { status: 400 });
      }
      if (body.price === undefined || isNaN(parseFloat(body.price)) || parseFloat(body.price) <= 0) {
        return NextResponse.json({ success: false, error: 'Valid book price greater than ₹0 is required' }, { status: 400 });
      }
      if (!body.summary || !body.summary.trim()) {
        return NextResponse.json({ success: false, error: 'Book summary & features are required' }, { status: 400 });
      }
      if (!body.cover_image_data) {
        return NextResponse.json({ success: false, error: 'Book cover image is required' }, { status: 400 });
      }
      const cover = parseDataUri(body.cover_image_data);
      const book = await prisma.book.create({
        data: {
          title: body.title.trim(),
          price: parseFloat(body.price),
          summary: body.summary.trim(),
          cover_image_data: cover.buffer,
          cover_mime_type: cover.mimeType,
          preview_file_data: null,
          preview_mime_type: 'application/pdf',
        },
      });
      clearCache('books');
      clearCache('stats');
      return NextResponse.json({
        success: true,
        data: {
          ...book,
          price: Number(book.price),
          cover_image_data: bufferToDataUri(book.cover_image_data, book.cover_mime_type || 'image/png'),
          preview_file_data: null,
        },
      });
    }

    // 5. Create Article
    if (action === 'articles') {
      if (!body.title || !body.title.trim()) {
        return NextResponse.json({ success: false, error: 'Article title is required' }, { status: 400 });
      }
      if (!body.content || !body.content.trim()) {
        return NextResponse.json({ success: false, error: 'Article content is required' }, { status: 400 });
      }
      const thumb = parseDataUri(body.thumbnail_data);
      const article = await prisma.article.create({
        data: {
          title: body.title.trim(),
          category: body.category || 'General Health',
          content: body.content.trim(),
          thumbnail_data: thumb.buffer,
          thumbnail_mime_type: thumb.mimeType,
        },
      });
      clearCache('articles');
      clearCache('stats');
      return NextResponse.json({
        success: true,
        data: {
          ...article,
          thumbnail_data: bufferToDataUri(article.thumbnail_data, article.thumbnail_mime_type || 'image/jpeg'),
        },
      });
    }

    // 6. Create Testimonial
    if (action === 'testimonials') {
      if (!body.patient_name || !body.patient_name.trim()) {
        return NextResponse.json({ success: false, error: 'Patient name is required' }, { status: 400 });
      }
      if (!body.condition_treated || !body.condition_treated.trim()) {
        return NextResponse.json({ success: false, error: 'Condition treated is required' }, { status: 400 });
      }
      if (!body.review_text || !body.review_text.trim()) {
        return NextResponse.json({ success: false, error: 'Review text is required' }, { status: 400 });
      }
      const testimonial = await prisma.testimonial.create({
        data: {
          patient_name: body.patient_name.trim(),
          location: body.location || '',
          condition_treated: body.condition_treated.trim(),
          review_text: body.review_text.trim(),
          is_published: body.is_published !== undefined ? Boolean(body.is_published) : true,
        },
      });
      clearCache('testimonials');
      clearCache('stats');
      return NextResponse.json({ success: true, data: testimonial });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// PUT Handler (Update: Evicts Cache Immediately)
// -----------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  if (!validateAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const id = searchParams.get('id') ? parseInt(searchParams.get('id')!, 10) : null;
  if (!id) return NextResponse.json({ success: false, error: 'ID is required for update' }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));

    if (action === 'products') {
      const updateData: Record<string, unknown> = {
        title: body.title,
        category: body.category,
        price: body.price !== undefined ? parseFloat(body.price) : undefined,
        description: body.description,
      };
      if (body.image_data && body.image_data.startsWith('data:')) {
        const { buffer, mimeType } = parseDataUri(body.image_data);
        updateData.image_data = buffer;
        updateData.image_mime_type = mimeType;
      }
      const updated = await prisma.product.update({ where: { id }, data: updateData });
      clearCache('products');
      clearCache('stats');
      return NextResponse.json({
        success: true,
        data: {
          ...updated,
          price: Number(updated.price),
          image_data: bufferToDataUri(updated.image_data, updated.image_mime_type || 'image/png'),
        },
      });
    }

    if (action === 'books') {
      const updateData: Record<string, unknown> = {
        title: body.title,
        price: body.price !== undefined ? parseFloat(body.price) : undefined,
        summary: body.summary,
      };
      if (body.cover_image_data && body.cover_image_data.startsWith('data:')) {
        const cover = parseDataUri(body.cover_image_data);
        updateData.cover_image_data = cover.buffer;
        updateData.cover_mime_type = cover.mimeType;
      }
      const updated = await prisma.book.update({ where: { id }, data: updateData });
      clearCache('books');
      clearCache('stats');
      return NextResponse.json({
        success: true,
        data: {
          ...updated,
          price: Number(updated.price),
          cover_image_data: bufferToDataUri(updated.cover_image_data, updated.cover_mime_type || 'image/png'),
          preview_file_data: null,
        },
      });
    }

    if (action === 'articles') {
      const updateData: Record<string, unknown> = {
        title: body.title,
        category: body.category,
        content: body.content,
      };
      if (body.thumbnail_data && body.thumbnail_data.startsWith('data:')) {
        const thumb = parseDataUri(body.thumbnail_data);
        updateData.thumbnail_data = thumb.buffer;
        updateData.thumbnail_mime_type = thumb.mimeType;
      }
      const updated = await prisma.article.update({ where: { id }, data: updateData });
      clearCache('articles');
      clearCache('stats');
      return NextResponse.json({
        success: true,
        data: {
          ...updated,
          thumbnail_data: bufferToDataUri(updated.thumbnail_data, updated.thumbnail_mime_type || 'image/jpeg'),
        },
      });
    }

    if (action === 'testimonials') {
      const updated = await prisma.testimonial.update({
        where: { id },
        data: {
          patient_name: body.patient_name,
          location: body.location,
          condition_treated: body.condition_treated,
          review_text: body.review_text,
          is_published: body.is_published !== undefined ? Boolean(body.is_published) : undefined,
        },
      });
      clearCache('testimonials');
      clearCache('stats');
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Database update error';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// DELETE Handler (Evicts Cache Immediately)
// -----------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  if (!validateAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const id = searchParams.get('id') ? parseInt(searchParams.get('id')!, 10) : null;
  if (!id) return NextResponse.json({ success: false, error: 'ID is required for deletion' }, { status: 400 });

  try {
    if (action === 'products') {
      await prisma.product.delete({ where: { id } });
      clearCache('products');
      clearCache('stats');
      return NextResponse.json({ success: true, message: 'Product deleted' });
    }
    if (action === 'books') {
      await prisma.book.delete({ where: { id } });
      clearCache('books');
      clearCache('stats');
      return NextResponse.json({ success: true, message: 'Book deleted' });
    }
    if (action === 'articles') {
      await prisma.article.delete({ where: { id } });
      clearCache('articles');
      clearCache('stats');
      return NextResponse.json({ success: true, message: 'Article deleted' });
    }
    if (action === 'testimonials') {
      await prisma.testimonial.delete({ where: { id } });
      clearCache('testimonials');
      clearCache('stats');
      return NextResponse.json({ success: true, message: 'Testimonial deleted' });
    }
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Database deletion error';
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
