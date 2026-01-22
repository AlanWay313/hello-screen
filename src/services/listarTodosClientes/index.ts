import api from "../api";

export async function ListarTodosClientes(integrador: any) {
  try {
    const result = await api.get("/src/clientes/listarclientes.php", {
      params: { idIntegra: integrador },
    });

    return result.data.data || [];
  } catch (error) {
    console.log(error);
    return [];
  }
}
