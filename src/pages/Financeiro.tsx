import Cost from "@/components/cost";
import TaxaImplantacao from "@/components/taxaimplantacao";
import { TitlePage } from "@/components/title";
import { Card } from "@/components/ui/card";
import { HandCoins } from "lucide-react";



export default function Financeiro(){

    return (
        <div>
           

            <div className="flex items-center">
            <HandCoins /><TitlePage title="Financeiro" />
            </div>


            <div className="flex items-center gap-2 mt-8">

            <Card className="w-[420px] h-[140px] p-2">
                    <Cost />
                </Card>
             <Card className="w-[420px] h-[140px] p-2">
                <TaxaImplantacao />
                </Card>

                
             </div>
        </div>
    )
}