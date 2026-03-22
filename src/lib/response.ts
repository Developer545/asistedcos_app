/**
 * response.ts — Helpers para respuestas API estandarizadas.
 * Formato: { success, data?, error?, pagination? }
 */

import { NextResponse } from 'next/server';
import { AppError, toAppError } from './errors';

type ApiSuccess<T> = { success: true; data: T; pagination?: PaginationMeta };
type ApiError      = { success: false; error: { message: string; code: string; fields?: Record<string, string[]> } };

export type PaginationMeta = {
  page: number; limit: number; total: number;
  totalPages: number; hasNext: boolean; hasPrev: boolean;
};

export function ok<T>(data: T, pagination?: PaginationMeta, status = 200) {
  const body: ApiSuccess<T> = { success: true, data, ...(pagination && { pagination }) };
  return NextResponse.json(body, { status });
}

export function created<T>(data: T) { return ok(data, undefined, 201); }

export function apiError(err: unknown) {
  const error = toAppError(err);
  const body: ApiError = { success: false, error: { message: error.message, code: error.code } };
  return NextResponse.json(body, { status: error.statusCode });
}

export function paginate(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

export function parsePagination(searchParams: URLSearchParams) {
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}
