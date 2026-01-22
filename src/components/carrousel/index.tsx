import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

import img1 from '@/assets/img3.jpg';
import img2 from '@/assets/im2.jpg';
import { Skeleton } from "@/components/ui/skeleton";

export function Carrousel() {
  const plugin = React.useRef(
    Autoplay({ 
        delay: 4000, 
        stopOnInteraction: true, 
        stopOnFocusIn: true, 
        jump: true 
    })
  );

  const images = [
    { id: 1, img: String(img1), text: "Inovação & Tecnologia" },
    { id: 2, img: String(img2), text: "Integração e Acompanhamento" }
  ];

  // Estado para controlar carregamento das imagens individualmente
  const [loadingImages, setLoadingImages] = React.useState(
    new Array(images.length).fill(true)
  );

  const handleImageLoad = (index: number) => {
    setLoadingImages((prev) => {
      const newLoadingState = [...prev];
      newLoadingState[index] = false;
      return newLoadingState;
    });
  };

  return (
    <div className="w-full h-full">
      <Carousel
        plugins={[plugin.current]}
        className="w-full h-full border-none shadow-none"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent className="h-full mt-11 shadow-none">
          {images.map((item, index) => (
            <CarouselItem key={index} className="w-full h-full shadow-none">
              <div className="p-2 h-full shadow-none">
                <Card className="w-full h-full border-none shadow-none">
                  <CardContent className="flex flex-col items-center justify-center p-0 h-full border-none shadow-none">

                    {/* Exibir skeleton enquanto a imagem não carrega */}
                    {loadingImages[index] && (
                      <Skeleton className="w-full h-64 rounded-lg" />
                    )}

                    <img
                      src={item.img}
                      alt={`Imagem ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                      onLoad={() => handleImageLoad(index)}
                      style={{ display: loadingImages[index] ? "none" : "block" }}
                    />

                    <div className="w-full text-start pt-8">
                      <h3 className="text-3xl">{item.text}</h3>
                    </div>

                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
