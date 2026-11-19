// Helper: llama a la Lonja API con el JWT (Authorization: Bearer <token>).
// El cliente NO se conecta a MariaDB: todo lo pide a la API por HTTP con fetch.
export const API_URL = () => (process.env.API_URL || 'http://localhost:2900/api').replace(/\/+$/, '');

// Error de la API: conserva el status HTTP y el cuerpo JSON ({ error, codigo, errores, ... })
export class ErrorApi extends Error {
    constructor(status, datos) {
        super(datos?.error || `HTTP ${status}`);
        this.status = status;
        this.datos = datos || {};
        this.codigo = datos?.codigo || null;
        this.errores = datos?.errores || null;
    }
}

// { pagina: 2, buscar: '' } -> "?pagina=2" (omite vacíos y valores que no son texto)
const armarQuery = (query) => {
    if (!query) return '';
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(query)) {
        if (valor === undefined || valor === null || valor === '' || typeof valor === 'object') continue;
        params.set(clave, String(valor));
    }
    const texto = params.toString();
    return texto ? `?${texto}` : '';
};

const pedir = async (ruta, { method = 'GET', body, token, ip, query } = {}) => {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    // La API usa la IP del navegador para los límites de intentos (login, registro)
    if (ip) headers['X-Forwarded-For'] = ip;

    let cuerpo;
    if (body instanceof FormData) {
        cuerpo = body; // multipart (lotes con imágenes): fetch pone el Content-Type con su boundary
    } else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        cuerpo = JSON.stringify(body);
    }

    try {
        return await fetch(`${API_URL()}${ruta}${armarQuery(query)}`, { method, headers, body: cuerpo });
    } catch {
        throw new ErrorApi(503, { error: 'No se pudo conectar con la Lonja API. Revisa que esté encendida (npm run server en lonja-api).' });
    }
};

const leerJson = async (respuesta) =>
    (respuesta.headers.get('content-type') || '').includes('application/json') ? respuesta.json() : null;

// Respuesta JSON (lanza ErrorApi si el status no es 2xx)
export async function api(ruta, opciones = {}) {
    const respuesta = await pedir(ruta, opciones);
    if (respuesta.status === 204) return null;
    const datos = await leerJson(respuesta);
    if (!respuesta.ok) throw new ErrorApi(respuesta.status, datos);
    return datos;
}

// Respuesta binaria (PDF o imagen). Devuelve la Response de fetch
export async function apiArchivo(ruta, opciones = {}) {
    const respuesta = await pedir(ruta, opciones);
    if (!respuesta.ok) throw new ErrorApi(respuesta.status, await leerJson(respuesta));
    return respuesta;
}

// Reenvía al navegador un archivo de la API (PDF de reportes)
export const enviarArchivo = async (res, respuesta) => {
    res.setHeader('Content-Type', respuesta.headers.get('content-type') || 'application/octet-stream');
    const disposicion = respuesta.headers.get('content-disposition');
    if (disposicion) res.setHeader('Content-Disposition', disposicion);
    res.send(Buffer.from(await respuesta.arrayBuffer()));
};

// Segmento seguro para armar la ruta de la API con datos de la URL (/lotes/:id)
export const seg = (valor) => encodeURIComponent(String(valor ?? ''));
