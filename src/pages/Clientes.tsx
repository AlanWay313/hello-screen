import { TabelaDeClientes } from "@/components/tabelaclientes";
import { TitlePage } from "@/components/title";

export function Clientes() {
  return (
    <div className="space-y-6">
      <TitlePage title="Clientes" />
      <TabelaDeClientes />
    </div>
  )
}
