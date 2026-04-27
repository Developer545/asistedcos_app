/**
 * Cliente API Ministerio de Hacienda — DTE El Salvador
 *
 * En modo offline (DTE_MODE=offline o sin credenciales) todas las funciones
 * retornan respuestas simuladas sin hacer requests reales al MH.
 *
 * Para conectar al MH real: configurar .env.local con DTE_MODE=test y las
 * credenciales DTE_MH_USER / DTE_MH_PASSWORD.
 */
import { DTE_API_URL, DTE_ENABLED } from './config';
import type { DteJson, MhAuthResponse, MhReceiveResponse } from './types';

let _tokenCache: { token: string; expiresAt: number } | null = null;

/* ── Autenticación ──────────────────────────────────────── */
async function getToken(): Promise<string> {
  // Si el token en caché sigue vigente (token MH dura ~24h)
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }

  const { DTE_CONFIG } = await import('./config');
  const res = await fetch(`${DTE_API_URL}/seguridad/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user:     DTE_CONFIG.mhUser,
      pwd:      DTE_CONFIG.mhPassword,
    }),
  });

  if (!res.ok) throw new Error(`MH Auth falló: ${res.status}`);

  const data: MhAuthResponse = await res.json();
  if (data.status !== 'OK' || !data.body?.token) {
    throw new Error('MH Auth: respuesta inválida');
  }

  _tokenCache = {
    token:     data.body.token,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000, // 23 horas
  };

  return data.body.token;
}

/* ── Firma digital ──────────────────────────────────────── */
/**
 * Firma el DTE JSON usando el servicio de firma.
 * Requiere DTE_SIGNING_URL y DTE_SIGNING_PASSWORD configurados.
 *
 * En modo offline o sin servicio de firma → retorna JSON sin firmar (nbd = null).
 */
async function firmarDte(dteJson: DteJson): Promise<string> {
  const { DTE_CONFIG } = await import('./config');

  if (!DTE_CONFIG.signingUrl) {
    // Sin servicio de firma: retornar el JSON como string (no firmado)
    // El MH rechazará esto en producción, pero sirve para pruebas de estructura
    return JSON.stringify(dteJson);
  }

  const res = await fetch(DTE_CONFIG.signingUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nit:    DTE_CONFIG.nit,
      activo: true,
      passwordPri: DTE_CONFIG.signingPassword,
      dteJson: JSON.stringify(dteJson),
    }),
  });

  if (!res.ok) throw new Error(`Firma DTE falló: ${res.status}`);

  const data = await res.json();
  return data.body ?? data.firma ?? JSON.stringify(dteJson);
}

/* ── Respuesta simulada (modo offline) ──────────────────── */
function simulatedResponse(codigoGeneracion: string): MhReceiveResponse {
  return {
    version:          1,
    ambiente:         '00',
    versionApp:       1,
    estado:           'RECIBIDO',
    codigoGeneracion,
    selloRecibido:    null,              // Sin sello en offline
    fhProcesamiento:  new Date().toISOString(),
    clasificaMsg:     'OFFLINE',
    codigoMsg:        '000',
    descripcionMsg:   'Modo sin conexión — DTE almacenado localmente',
    observaciones:    ['Configurar DTE_MODE=test para conectar al MH'],
  };
}

/* ── Envío al MH ────────────────────────────────────────── */
export interface DteEnvioResult {
  selloRecibido:   string | null;
  codigoGeneracion: string;
  estado:          string;
  fechaProcesamiento: string;
  observaciones:   string[];
  jsonDte:         string;
  modoOffline:     boolean;
}

export async function enviarDte(dteJson: DteJson): Promise<DteEnvioResult> {
  const codigoGeneracion = dteJson.identificacion.codigoGeneracion;
  const jsonStr          = JSON.stringify(dteJson);

  // Modo offline: no enviar al MH
  if (!DTE_ENABLED) {
    const resp = simulatedResponse(codigoGeneracion);
    return {
      selloRecibido:      null,
      codigoGeneracion,
      estado:             'CONTINGENCIA',
      fechaProcesamiento: resp.fhProcesamiento,
      observaciones:      resp.observaciones,
      jsonDte:            jsonStr,
      modoOffline:        true,
    };
  }

  // Modo online: firmar y enviar
  try {
    const jsonFirmado = await firmarDte(dteJson);
    const token       = await getToken();

    const res = await fetch(`${DTE_API_URL}/recepcion/fngd`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        ambiente:         dteJson.identificacion.ambiente,
        idEnvio:          1,
        version:          1,
        tipoDte:          dteJson.identificacion.tipoDte,
        documento:        jsonFirmado,
        codigoGeneracion,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`MH recepción ${res.status}: ${err}`);
    }

    const mhResp: MhReceiveResponse = await res.json();

    return {
      selloRecibido:      mhResp.selloRecibido,
      codigoGeneracion:   mhResp.codigoGeneracion,
      estado:             mhResp.estado,
      fechaProcesamiento: mhResp.fhProcesamiento,
      observaciones:      mhResp.observaciones ?? [],
      jsonDte:            jsonFirmado,
      modoOffline:        false,
    };
  } catch (err) {
    // Si falla el envío, guardar en contingencia
    console.error('[DTE] Error enviando al MH, guardando en contingencia:', err);
    return {
      selloRecibido:      null,
      codigoGeneracion,
      estado:             'CONTINGENCIA',
      fechaProcesamiento: new Date().toISOString(),
      observaciones:      [err instanceof Error ? err.message : 'Error de conexión'],
      jsonDte:            jsonStr,
      modoOffline:        false,
    };
  }
}
