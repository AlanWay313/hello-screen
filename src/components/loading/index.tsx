import logo from '../../../public/logo.jpeg';

export function Loading() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center fixed top-0 left-0 z-50 bg-background/95 backdrop-blur-sm">
      {/* Logo com animação de pulse */}
      <div className="relative mb-8">
        {/* Anel animado ao redor da logo */}
        <div className="absolute inset-0 -m-3">
          <div className="w-24 h-24 rounded-full border-2 border-primary/20 animate-ping" />
        </div>
        <div className="absolute inset-0 -m-2">
          <div className="w-22 h-22 rounded-full border-2 border-primary/30 animate-pulse" />
        </div>
        
        {/* Logo circular */}
        <div className="relative w-18 h-18 rounded-full overflow-hidden shadow-xl ring-4 ring-primary/20">
          <img 
            src={logo} 
            alt="SysProv" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Spinner moderno */}
      <div className="relative w-12 h-12 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
      </div>

      {/* Texto */}
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground mb-1">Carregando</p>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          Aguarde um momento
          <span className="inline-flex">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
          </span>
        </p>
      </div>
    </div>
  );
}
