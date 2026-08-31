const host = window.location.hostname;
const isLocal = host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);

export const BASE_URL = isLocal ? 'http://192.168.1.59:8000' : 'https://server-55lr.vercel.app';
