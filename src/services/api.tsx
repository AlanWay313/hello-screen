import axios from 'axios';

// Crie uma instância do Axios

// https://webhooks.sysprov.com.br/ole/ frionline
// https://hub.sysprov.com.br/integraoletv/ netcom

const api = axios.create({
  baseURL: 'https://hub.sysprov.com.br/integraoletv/', 
                 
});

// Interceptor de requisição (antes de enviar a requisição)
api.interceptors.request.use(
  (config) => {
    // Adicione um token de autenticação ou outros headers
    const token = localStorage.getItem('token'); // Pegue o token de algum lugar (localStorage, etc)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Manipular erros antes de enviar a requisição
    return Promise.reject(error);
  }
);

// Interceptor de resposta (antes de processar a resposta)
api.interceptors.response.use(
  (response) => {
    // Você pode modificar a resposta antes de retornar para o código que fez a requisição
    return response;
  },
  (error) => {
    // Manipular erros da resposta (ex: redirecionar para login se for 401)
    if (error.response && error.response.status === 401) {
      // Exemplo: redirecionar para login se não autorizado
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
