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

interface DesbloqueioResponse {
  retorno_status: boolean;
  mensagem?: string;
  error?: string;
  [key: string]: any;
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

/**
 * Desbloqueia um contrato a partir do ID do bloqueio
 * Endpoint: POST /contratos/desbloqueio/{id_contrato}/{id_bloqueio}
 */
export async function desbloquearContrato(
  idContrato: number | string,
  idBloqueio: number | string
): Promise<DesbloqueioResponse> {
  const keyapi = import.meta.env.VITE_OLETV_KEYAPI;
  const login = import.meta.env.VITE_OLETV_LOGIN;
  const pass = import.meta.env.VITE_OLETV_PASS;

  if (!keyapi || !login || !pass) {
    console.warn('Credenciais da API OleTV não configuradas');
    return { retorno_status: false, error: 'Credenciais não configuradas' };
  }

  try {
    const formData = new FormData();
    formData.append('keyapi', keyapi);
    formData.append('login', login);
    formData.append('pass', pass);

    const response = await axios.post<DesbloqueioResponse>(
      `https://api.oletv.net.br/contratos/desbloqueio/${idContrato}/${idBloqueio}`,
      formData
    );

    return response.data;
  } catch (error) {
    console.error('Erro ao desbloquear contrato:', error);
    return { retorno_status: false, error: 'Erro ao desbloquear contrato' };
  }
}

/**
 * Bloqueia um contrato
 * Endpoint: POST /contratos/bloqueio/{id_contrato}
 * @param idContrato - ID do contrato
 * @param motivoSuspensao - 1 = Inadimplência, 2 = Pedido do Cliente
 * @param dataEncerramento - Data para encerramento do bloqueio (dd/mm/aaaa) - opcional
 */
export async function bloquearContrato(
  idContrato: number | string,
  motivoSuspensao: 1 | 2,
  dataEncerramento?: string
): Promise<DesbloqueioResponse> {
  const keyapi = import.meta.env.VITE_OLETV_KEYAPI;
  const login = import.meta.env.VITE_OLETV_LOGIN;
  const pass = import.meta.env.VITE_OLETV_PASS;

  if (!keyapi || !login || !pass) {
    console.warn('Credenciais da API OleTV não configuradas');
    return { retorno_status: false, error: 'Credenciais não configuradas' };
  }

  try {
    const formData = new FormData();
    formData.append('keyapi', keyapi);
    formData.append('login', login);
    formData.append('pass', pass);
    formData.append('motivo_suspensao', String(motivoSuspensao));
    
    if (dataEncerramento) {
      formData.append('data_encerramento', dataEncerramento);
    }

    const response = await axios.post<DesbloqueioResponse>(
      `https://api.oletv.net.br/contratos/bloqueio/${idContrato}`,
      formData
    );

    return response.data;
  } catch (error) {
    console.error('Erro ao bloquear contrato:', error);
    return { retorno_status: false, error: 'Erro ao bloquear contrato' };
  }
}

export type { Bloqueio, BloqueiosResponse, DesbloqueioResponse };
