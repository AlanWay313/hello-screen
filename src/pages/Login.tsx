import { useState, useEffect, useContext } from "react";
import { Eye, EyeOff, KeyRound, Mail, ChevronLeft, ChevronRight, Sparkles, Zap, Shield, ArrowRight } from "lucide-react";
import { AuthContext } from "@/contexts/Auth";
import logo from '../../public/logo.jpeg';

const carouselSlides = [
  {
    id: 1,
    title: "Integrações Inteligentes",
    subtitle: "Conecte seus sistemas de forma simples",
    icon: Zap,
    description: "Automatize processos e integre seu ERP com as melhores soluções do mercado",
    color: "from-blue-500 to-cyan-400"
  },
  {
    id: 2,
    title: "Gestão Simplificada",
    subtitle: "Tudo em um só lugar",
    icon: Sparkles,
    description: "Gerencie clientes, acompanhe métricas e tome decisões com dados em tempo real",
    color: "from-violet-500 to-purple-400"
  },
  {
    id: 3,
    title: "Segurança Total",
    subtitle: "Seus dados protegidos",
    icon: Shield,
    description: "Infraestrutura segura e confiável para sua operação",
    color: "from-emerald-500 to-teal-400"
  },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-accent/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-80 h-80 bg-success/10 rounded-full blur-3xl" />
      </div>

      {/* Login Form Section */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-xl ring-2 ring-white/10">
                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">SysProv</span>
                <span className="text-2xl font-bold text-white"> + Frionline</span>
                <p className="text-sm text-slate-400">Sistema de Integração</p>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo de volta</h1>
              <p className="text-slate-400">Entre na sua conta para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email</label>
                <div className={`relative transition-all duration-300 ${focusedField === 'email' ? 'scale-[1.02]' : ''}`}>
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === 'email' ? 'text-primary' : 'text-slate-500'}`}>
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 h-14 bg-white/5 border-2 border-white/10 rounded-xl px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all duration-200"
                    placeholder="Digite seu email"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Senha</label>
                <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'scale-[1.02]' : ''}`}>
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === 'password' ? 'text-primary' : 'text-slate-500'}`}>
                    <KeyRound size={20} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-12 h-14 bg-white/5 border-2 border-white/10 rounded-xl px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all duration-200"
                    placeholder="Digite sua senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end">
                <button type="button" className="text-sm text-primary hover:text-primary/80 transition-colors">
                  Esqueceu a senha?
                </button>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full h-14 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 group"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar na plataforma
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <p className="text-slate-500 text-sm">
                © 2024 SysProv + Frionline. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Carousel Section */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Animated Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${currentSlideData.color} transition-all duration-1000`}>
          <div className="absolute inset-0 bg-black/20" />
        </div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-32 h-32 border-2 border-white/20 rounded-full animate-pulse" />
          <div className="absolute top-1/3 right-20 w-24 h-24 border-2 border-white/15 rounded-2xl rotate-45 animate-bounce" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-40 left-1/4 w-16 h-16 bg-white/10 rounded-full blur-sm" />
          <div className="absolute top-1/2 left-10 w-20 h-20 border-2 border-white/10 rounded-xl rotate-12" />
          <div className="absolute bottom-20 right-32 w-28 h-28 border-2 border-white/10 rounded-full" />
          
          {/* Gradient Orbs */}
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-black/20 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center w-full p-12">
          <div className="text-center text-white max-w-lg">
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl">
                <IconComponent size={48} strokeWidth={1.5} />
              </div>
            </div>
            
            <h2 className="text-5xl font-bold mb-4 leading-tight animate-fade-in">
              {currentSlideData.title}
            </h2>
            
            <p className="text-2xl mb-4 text-white/90 font-medium">
              {currentSlideData.subtitle}
            </p>
            
            <p className="text-white/70 text-lg leading-relaxed max-w-md mx-auto">
              {currentSlideData.description}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <p className="text-3xl font-bold">500+</p>
                <p className="text-sm text-white/70">Clientes Ativos</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <p className="text-3xl font-bold">99.9%</p>
                <p className="text-sm text-white/70">Uptime</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <p className="text-3xl font-bold">24/7</p>
                <p className="text-sm text-white/70">Suporte</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/20 transition-all duration-200 border border-white/20"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        
        <button 
          onClick={nextSlide}
          className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/20 transition-all duration-200 border border-white/20"
        >
          <ChevronRight size={24} className="text-white" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-10 bg-white' 
                  : 'w-2.5 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
