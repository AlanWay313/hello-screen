import { useState, useContext } from "react";
import { Eye, EyeOff, KeyRound, Mail, ArrowRight, Building2 } from "lucide-react";
import { AuthContext } from "@/contexts/Auth";
import logo from '../../public/logo.jpeg';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { signin } = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Preencha todos os campos!");

    setIsLoading(true);
    const result = await signin({ email, password });
    console.log(result);
    setIsLoading(false);
    setPassword("");
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-10 flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md">
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-xl font-semibold text-slate-900">SysProv</span>
              <span className="text-xl font-semibold text-slate-400"> + Olé TV</span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Acesso ao Sistema</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Entrar na plataforma</h2>
            <p className="text-slate-500">Insira suas credenciais para acessar o sistema</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Seu e-mail</label>
              <div className={`relative transition-all duration-200 ${focusedField === 'email' ? 'ring-2 ring-slate-900 ring-offset-2' : ''} rounded-lg`}>
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === 'email' ? 'text-slate-900' : 'text-slate-400'}`}>
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-11 h-12 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all duration-200"
                  placeholder="Digite seu e-mail"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Senha</label>
              <div className={`relative transition-all duration-200 ${focusedField === 'password' ? 'ring-2 ring-slate-900 ring-offset-2' : ''} rounded-lg`}>
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === 'password' ? 'text-slate-900' : 'text-slate-400'}`}>
                  <KeyRound size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-11 pr-11 h-12 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all duration-200"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <button type="button" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">
                Esqueceu a senha?
              </button>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full h-12 bg-slate-900 text-white rounded-lg font-medium transition-all duration-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Acessar sistema</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-slate-400 text-xs text-center">
              Ao acessar, você concorda com os termos de uso e política de privacidade.
            </p>
          </div>

          {/* Mobile Copyright */}
          <div className="lg:hidden mt-8 text-center">
            <p className="text-slate-400 text-xs">
              © 2024 SysProv + Olé TV
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex flex-1 bg-slate-900 relative overflow-hidden">
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Top - Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10">
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-xl font-semibold text-white">SysProv</span>
              <span className="text-xl font-semibold text-slate-400"> + Olé TV</span>
            </div>
          </div>

          {/* Center - Main Message */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white leading-tight mb-6">
              Integração ERP + Olé TV
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-8">
              Plataforma centralizada para gerenciar a integração entre seu ERP e os serviços da Olé TV de forma simples e eficiente.
            </p>

            {/* Features List */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-slate-300">Sincronização automática de dados</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-slate-300">Gestão centralizada de clientes</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-slate-300">Relatórios e métricas em tempo real</span>
              </div>
            </div>
          </div>

          {/* Bottom - Copyright */}
          <div>
            <p className="text-slate-500 text-sm">
              © 2024 SysProv + Olé TV. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
