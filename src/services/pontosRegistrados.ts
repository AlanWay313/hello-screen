import axios from 'axios';

interface Ponto {
  marca: string;
  modelo: string;
  mac: string;
  status: 'online' | 'offline';
}

interface PontosResponse {
  retorno_status: boolean;
  pontos: Ponto[];
}

/**
 * Busca os pontos registrados de um contrato
 * @param idContrato - ID do contrato do cliente
 * @returns Lista de pontos com status online/offline
 */
export async function buscarPontosRegistrados(idContrato: number | string): Promise<PontosResponse> {
  const keyapi = import.meta.env.VITE_OLETV_KEYAPI;
  const login = import.meta.env.VITE_OLETV_LOGIN;
  const pass = import.meta.env.VITE_OLETV_PASS;

  if (!keyapi || !login || !pass) {
    console.warn('Credenciais da API OleTV não configuradas');
    return { retorno_status: false, pontos: [] };
  }

  try {
    const formData = new FormData();
    formData.append('keyapi', keyapi);
    formData.append('login', login);
    formData.append('pass', pass);

    const response = await axios.post<PontosResponse>(
      `https://api.oletv.net.br/contratos/pontosregistrados/${idContrato}`,
      formData
    );

    return response.data;
  } catch (error) {
    console.error('Erro ao buscar pontos registrados:', error);
    return { retorno_status: false, pontos: [] };
  }
}

export type { Ponto, PontosResponse };
