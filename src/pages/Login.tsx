import { useState, useEffect, useContext } from "react";
import { Eye, EyeOff, KeyRound, Mail, ChevronLeft, ChevronRight, Sparkles, Zap, Shield } from "lucide-react";
import { AuthContext } from "@/contexts/Auth";
import logo from '../../public/logo.jpeg';

const carouselSlides = [
  {
    id: 1,
    title: "Integrações Inteligentes",
    subtitle: "Conecte seus sistemas de forma simples",
    icon: Zap,
    description: "Automatize processos e integre seu ERP com as melhores soluções do mercado"
  },
  {
    id: 2,
    title: "Gestão Simplificada",
    subtitle: "Tudo em um só lugar",
    icon: Sparkles,
    description: "Gerencie clientes, acompanhe métricas e tome decisões com dados em tempo real"
  },
  {
    id: 3,
    title: "Segurança Total",
    subtitle: "Seus dados protegidos",
    icon: Shield,
    description: "Infraestrutura segura e confiável para sua operação"
  },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const { signin } = useContext(AuthContext);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Preencha todos os campos!");

    setIsLoading(true);
    const result = await signin({ email, password });
    console.log(result);
    setIsLoading(false);
    setPassword("");
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);

  const currentSlideData = carouselSlides[currentSlide];
  const IconComponent = currentSlideData.icon;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Login Form Section */}
      <div className="flex-1 flex items-center justify-center p-8 bg-card relative">
        {/* Logo */}
        <div className="absolute top-8 left-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-soft">
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-lg font-bold gradient-text">SysProv</span>
              <span className="text-lg font-bold text-foreground"> + Frionline</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Bem-vindo de volta</h1>
            <p className="text-muted-foreground">Entre na sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 h-12 bg-secondary/50 border border-border rounded-xl px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                  placeholder="Digite seu email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Senha</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <KeyRound size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 h-12 bg-secondary/50 border border-border rounded-xl px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                  placeholder="Digite sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full h-12 btn-gradient rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar na plataforma"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Carousel Section */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 border border-primary-foreground/20 rounded-full animate-pulse" />
          <div className="absolute top-40 right-32 w-20 h-20 border border-primary-foreground/15 rounded-lg rotate-45" />
          <div className="absolute bottom-32 left-32 w-16 h-16 border border-primary-foreground/20 rounded-full" />
          <div className="absolute bottom-20 right-20 w-28 h-28 border border-primary-foreground/10 rounded-2xl rotate-12" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center w-full p-12">
          <div className="text-center text-primary-foreground max-w-lg animate-fade-in">
            <div className="mb-8 flex justify-center">
              <div className="w-20 h-20 bg-primary-foreground/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-primary-foreground/20">
                <IconComponent size={40} />
              </div>
            </div>
            
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              {currentSlideData.title}
            </h2>
            
            <p className="text-xl mb-4 text-primary-foreground/90">
              {currentSlideData.subtitle}
            </p>
            
            <p className="text-primary-foreground/70 leading-relaxed">
              {currentSlideData.description}
            </p>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary-foreground/10 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-primary-foreground/20 transition-all duration-200 border border-primary-foreground/20"
        >
          <ChevronLeft size={24} className="text-primary-foreground" />
        </button>
        
        <button 
          onClick={nextSlide}
          className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary-foreground/10 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-primary-foreground/20 transition-all duration-200 border border-primary-foreground/20"
        >
          <ChevronRight size={24} className="text-primary-foreground" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8 bg-primary-foreground' 
                  : 'w-2 bg-primary-foreground/40 hover:bg-primary-foreground/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
