# ASISTEDCOS Admin ERP — Contexto para Codex

> **DIRECTIVAS DE SESIÓN**: NO explorar el proyecto al inicio. Este archivo + memoria persistente contienen todo el contexto. Ir directo a la tarea. Usar agentes para búsquedas paralelas. Usar skills cuando apliquen. Leer solo archivos que la tarea requiera.

## Proyecto
ERP interno para **Fundación ASISTEDCOS** — ONG salvadoreña. Single-tenant (una sola organización). Gestiona finanzas, proyectos, donaciones, planilla, inventario, DTE y CMS del sitio web público.

## URLs y Credenciales
| Servicio | URL | Credenciales |
|----------|-----|-------------|
| Admin ERP | `asistedcosadmin.vercel.app` | `admin@asistedcos.org` / `admin123` |
| Sitio público | `asistedcos.org` | — |
| GitHub | `github.com/Developer545/asistedcos_app.git` | — |

## Stack
| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| UI | Ant Design 6 (primario `#2d6b1a` verde bosque) + Tailwind CSS 4 |
| Backend | Next.js API Routes + Prisma 7 + Neon PostgreSQL (pgBouncer, max 10) |
| Auth | JWT httpOnly cookies (jose, HS256) — `ong_access_token` / `ong_refresh_token` |
| Roles | ADMIN / USER (single-tenant, sin multi-tenant) |
| State | @tanstack/react-query 5 + react-hook-form + Zod |
| Charts | Recharts 3 |
| Icons | Phosphor Icons (sidebar) + Lucide |
| Storage | Cloudinary (signed uploads) |
| Toasts | Sonner |
| Deploy | Vercel auto-deploy desde `master` |

## Estructura
```
src/
  app/
    (auth)/login/              → Login page
    (dashboard)/               → 19 módulos protegidos:
      dashboard/                 KPIs + recharts + calendario fiscal SV
      proyectos/                 Proyectos ONG + fotos
      donaciones/                Donaciones + donantes
      beneficiarios/             Beneficiarios programas
      voluntarios/               Voluntarios + participaciones
      miembros/                  Miembros junta directiva
      gastos/                    Gastos + categorías
      compras/                   Órdenes compra + proveedores
      inventario/                Productos + Kardex
      proveedores/               Proveedores
      planilla/                  Nómina (ISSS/AFP/Renta)
      presupuesto/               Presupuesto anual
      certificados/              DTE tipo 46 (donaciones)
      facturacion/               DTE 01/03/05/06
      retenciones/               DTE tipo 11
      libros-iva/                F-07 Ventas, F-14 Compras
      actas/                     Actas de reuniones
      gestion-web/               CMS (contenido, noticias, galería, causas, FAQ, aliados)
      configuracion/             Config organización
      reportes/                  Reportes generales
    api/                       → 60+ route handlers REST
    api/public/                → API pública (CORS → asistedcos.org)
  components/
    shared/                    → AntdProvider, CloudinaryUpload, KpiCard, PageHeader
    layout/DashboardSidebar.tsx
  lib/
    prisma.ts                  → Singleton con PG adapter + pooling
    auth.ts                    → JWT sign/verify (HS256), 15min access / 7d refresh
    api.ts                     → apiFetch() wrapper con auto-refresh en 401
    errors.ts                  → Error classes custom
    rate-limit.ts              → Rate limiting
    validate.ts                → Validación input
    planilla.ts                → Cálculos planilla SV
    response.ts                → Formato respuestas API
  middleware.ts                → JWT verification, públicas: /login, /api/public/*, /api/auth/*
  scripts/                     → seed-images, seed-web-content
prisma/schema.prisma           → 785 líneas, 25+ modelos, 11 enums
```

## Modelos Prisma clave
| Grupo | Modelos |
|-------|---------|
| Usuarios | User (ADMIN/USER), OrgConfig |
| Personas | Member, Donor, Beneficiary, Volunteer, VolunteerParticipation |
| Finanzas | Donation, DonationCert, Expense, ExpenseCategory, Purchase, PurchaseDetail |
| Planilla | Payroll, PayrollConfig (ISSS, AFP, Renta, INSAFORP) |
| Inventario | Product, Kardex |
| DTE | Invoice, InvoiceDetail, RetentionCert, Correlativo |
| Presupuesto | Budget, BudgetLine |
| Compliance | IvaBookEntry, ActaRecord |
| CMS Web | WebContent, WebNews, WebGallery, WebCause, WebFaq, WebPartner |

## CMS Web (alimenta sitio Astro público)
Endpoints `/api/public/*` con CORS habilitado para `asistedcos.org`:
- `contenido` → secciones hero/about
- `noticias` → blog con slug
- `galeria` → imágenes Cloudinary
- `causas` → campañas con meta/recaudado
- `faq` → preguntas frecuentes
- `aliados` → partners logos

## Seguridad
- Rate limiting en API
- CORS restringido a `/api/public/*` solo desde `asistedcosong.vercel.app`
- Security headers: X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy
- Permissions-Policy: camera/microphone/geolocation disabled
- Cloudinary signed uploads

## Comandos
```bash
npm run dev                        # dev server (:3000)
npm run build                      # prisma generate + next build
npm run db:seed                    # seed datos iniciales
npm run db:studio                  # Prisma Studio GUI
npm run db:generate                # prisma generate
npm run db:migrate                 # prisma migrate dev
npm run db:deploy                  # prisma migrate deploy
git push origin master             # deploy Vercel
```

## Proyectos relacionados
- **Sitio público**: `C:\ProjectosDev\asistedcos_ong` → `asistedcos.org`
- Cambios en modelos Web* afectan directamente el sitio público
