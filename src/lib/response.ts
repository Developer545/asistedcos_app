/**
 * response.ts — Helpers para respuestas API estandarizadas.
 * Formato: { success, data?, error?, pagination? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { toAppError } from './errors';

type ApiSuccess<T> = { success: true; data: T; pagination?: PaginationMeta };
type ApiErrorBody  = { success: false; error: { message: string; code: string } };

export type PaginationMeta = {
  page: number; limit: number; total: number;
  totalPages: number; hasNext: boolean; hasPrev: boolean;
};

export function ok<T>(data: T, status = 200): NextResponse {
  const body: ApiSuccess<T> = { success: true, data };
  return NextResponse.json(body, { status });
}

export function created<T>(data: T): NextResponse { return ok(data, 201); }

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function apiError(err: unknown, status?: number): NextResponse {
  if (typeof err === 'string') {
    const body: ApiErrorBody = { success: false, error: { message: err, code: 'BAD_REQUEST' } };
    return NextResponse.json(body, { status: status ?? 400 });
  }
  const error = toAppError(err);
  const body: ApiErrorBody = { success: false, error: { message: error.message, code: error.code } };
  return NextResponse.json(body, { status: status ?? error.statusCode });
}

/** Devuelve NextResponse paginado — uso: return paginate(data, total, page, limit) */
export function paginate<T>(data: T[], total: number, page: number, limit: number): NextResponse {
  const totalPages = Math.ceil(total / limit);
  const pagination: PaginationMeta = {
    page, limit, total, totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
  const body: ApiSuccess<T[]> = { success: true, data, pagination };
  return NextResponse.json(body, { status: 200 });
}

/** Extrae page, limit y skip de un NextRequest */
export function parsePagination(req: NextRequest): { page: number; limit: number; skip: number } {
  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '1',  10));
  const limit = Math.min(200, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10)));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}
