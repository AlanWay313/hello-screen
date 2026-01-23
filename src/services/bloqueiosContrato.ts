import axios from 'axios';

interface Bloqueio {
  id: string;
  tipo_id: string;
  tipo_nome: string;
  inicio: string;
  termino: string | null;
  status_nome: string;
}

interface BloqueiosResponse {
  retorno_status: boolean;
  bloqueios: Bloqueio[];
  error?: string;
}

/**
 * Busca os bloqueios de um contrato
 * @param idContrato - ID do contrato do cliente
 * @param ativos - Listar apenas bloqueios ativos (true ou false)
 * @returns Lista de bloqueios do contrato
 */
export async function buscarBloqueiosContrato(
  idContrato: number | string,
  ativos: boolean = false
): Promise<BloqueiosResponse> {
  const keyapi = import.meta.env.VITE_OLETV_KEYAPI;
  const login = import.meta.env.VITE_OLETV_LOGIN;
  const pass = import.meta.env.VITE_OLETV_PASS;

  if (!keyapi || !login || !pass) {
    console.warn('Credenciais da API OleTV não configuradas');
    return { retorno_status: false, bloqueios: [] };
  }

  try {
    const formData = new FormData();
    formData.append('keyapi', keyapi);
    formData.append('login', login);
    formData.append('pass', pass);

    const response = await axios.post<BloqueiosResponse>(
      `https://api.oletv.net.br/contratos/listarbloqueios/${idContrato}/${ativos}`,
      formData
    );

    // Trata caso de nenhum bloqueio
    if (!response.data.retorno_status && !response.data.bloqueios) {
      return { retorno_status: false, bloqueios: [], error: response.data.error };
    }

    return response.data;
  } catch (error) {
    console.error('Erro ao buscar bloqueios do contrato:', error);
    return { retorno_status: false, bloqueios: [] };
  }
}

export type { Bloqueio, BloqueiosResponse };
