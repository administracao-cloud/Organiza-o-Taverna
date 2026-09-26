import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { 
  ChefHat, Lock, Mail, KeyRound, ShieldCheck, UserPlus, 
  AlertCircle, Sparkles, CheckCircle2, ArrowLeft, User, Briefcase, RefreshCw 
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, signUpWithSupabase, resetPasswordWithSupabase, changePassword, userAccounts } = useBakery();
  
  // Auth Modes: 'login' | 'signup' | 'forgot'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // SignUp State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');

  // Status & Feedback States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // First Access Password Change Modal state (legacy/safety check)
  const [showFirstAccessModal, setShowFirstAccessModal] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingUserName, setPendingUserName] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [modalError, setModalError] = useState('');

  const clearFeedback = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const switchMode = (mode: 'login' | 'signup' | 'forgot') => {
    clearFeedback();
    setAuthMode(mode);
  };

  // 1. Submit Login
  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!email || !password) {
      setErrorMsg('Por favor, informe o e-mail e a senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(email, password);
      if (!res.success) {
        setErrorMsg(res.message || 'E-mail ou senha incorretos.');
        setIsSubmitting(false);
        return;
      }

      // Check if first access password change is required
      if (res.isFirstAccess) {
        const userObj = userAccounts.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        if (userObj) {
          setPendingUserId(userObj.id);
          setPendingUserName(userObj.name);
          setShowFirstAccessModal(true);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit SignUp (Create Account in Supabase)
  const handleSubmitSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!signUpName || !signUpEmail || !signUpPassword) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    if (signUpPassword.length < 6) {
      setErrorMsg('A senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMsg('A confirmação de senha não confere com a nova senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signUpWithSupabase(signUpName, signUpEmail, signUpPassword);
      if (res.success) {
        setSuccessMsg(res.message || 'Sua conta foi criada e está aguardando a aprovação do Administrador');
        setSignUpName('');
        setSignUpEmail('');
        setSignUpPassword('');
        setSignUpConfirmPassword('');
        setAuthMode('login');
      } else {
        setErrorMsg(res.message || 'Erro ao criar conta. Verifique os dados e tente novamente.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao conectar ao Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Submit Forgot Password (Reset via Supabase Auth)
  const handleSubmitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!forgotEmail) {
      setErrorMsg('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPasswordWithSupabase(forgotEmail);
      if (res.success) {
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message || 'Não foi possível solicitar a recuperação para este e-mail.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao comunicar com o servidor de autenticação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // First Access Password Change
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!newPassword || newPassword.length < 6) {
      setModalError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setModalError('A confirmação de senha não confere.');
      return;
    }

    if (pendingUserId) {
      const res = changePassword(pendingUserId, newPassword);
      if (res.success) {
        setShowFirstAccessModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMsg('Senha alterada com sucesso! Bem-vindo ao Saborê.');
      } else {
        setModalError(res.message || 'Erro ao alterar senha.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#313338] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#2B2D31] border border-[#3F4147] backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl shadow-lg shadow-amber-900/40 mb-3">
            <ChefHat className="w-10 h-10 text-stone-900" />
          </div>
          <h1 className="text-2xl font-bold text-stone-100 font-serif">Saborê Confeitaria</h1>
          <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest font-sans font-medium">
            {authMode === 'login' && 'Sistema Integrado de Gestão & Produção'}
            {authMode === 'signup' && 'Cadastro de Nova Conta via Supabase'}
            {authMode === 'forgot' && 'Recuperação de Senha Supabase Auth'}
          </p>
        </div>

        {/* Global Success Feedback */}
        {/* Success Feedback */}
        {successMsg && (
          <div className="mb-6 p-3.5 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Global Error or Pending Approval Feedback */}
        {errorMsg && (
          <div className={`mb-6 p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
            errorMsg.includes('aguardando a aprovação') || errorMsg.includes('Pendente')
              ? 'bg-amber-950/90 border border-amber-500/60 text-amber-200'
              : 'bg-rose-950/90 border border-rose-500/50 text-rose-200'
          }`}>
            <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              errorMsg.includes('aguardando a aprovação') || errorMsg.includes('Pendente')
                ? 'text-amber-400'
                : 'text-rose-400'
            }`} />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* MODE 1: LOGIN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleSubmitLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@sabore.pvh.br"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-900/90 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-stone-300">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-900/90 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold text-sm rounded-xl transition-all shadow-lg shadow-amber-950/50 hover:shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-stone-900" />
                  <span>Autenticando no Supabase...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Acessar o Sistema</span>
                </>
              )}
            </button>

            {/* Bottom Action: Register New Account */}
            <div className="mt-6 pt-5 border-t border-stone-700/60 text-center">
              <p className="text-xs text-stone-400 mb-2">Ainda não possui uma conta de acesso?</p>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="w-full py-2.5 bg-stone-900/80 hover:bg-stone-700/80 border border-stone-700 hover:border-amber-500/50 text-amber-400 hover:text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4 text-amber-500" />
                <span>Criar uma nova conta</span>
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: SIGNUP FORM (CREATE NEW ACCOUNT VIA SUPABASE) */}
        {authMode === 'signup' && (
          <form onSubmit={handleSubmitSignUp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="Ex: Maria Oliveira"
                  className="w-full pl-9 pr-3 py-2 bg-stone-900/90 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="novo.usuario@sabore.pvh.br"
                  className="w-full pl-9 pr-3 py-2 bg-stone-900/90 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-stone-900/80 border border-stone-700/80 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-stone-300 leading-relaxed">
                Novas contas são criadas com status <strong>Pendente</strong>. O Administrador definirá o seu cargo após a aprovação de acesso.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Senha de Acesso (Mínimo 6 caracteres)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-stone-900/90 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-stone-900/90 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold text-sm rounded-xl transition-all shadow-lg shadow-amber-950/50 hover:shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-stone-900" />
                  <span>Cadastrando no Supabase...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Criar Conta no Supabase</span>
                </>
              )}
            </button>

            <div className="mt-4 pt-3 border-t border-stone-700/60 text-center">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Já possui uma conta? <strong>Voltar ao Login</strong></span>
              </button>
            </div>
          </form>
        )}

        {/* MODE 3: FORGOT PASSWORD FORM (SUPABASE RESET) */}
        {authMode === 'forgot' && (
          <form onSubmit={handleSubmitForgot} className="space-y-4">
            <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-200">
              Digite o e-mail associado à sua conta do Saborê. Enviaremos um link direto para redefinição de senha via Supabase Auth.
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                E-mail Cadastrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="seu.email@sabore.pvh.br"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-900/90 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold text-sm rounded-xl transition-all shadow-lg shadow-amber-950/50 hover:shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-stone-900" />
                  <span>Solicitando ao Supabase...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Enviar Instruções de Recuperação</span>
                </>
              )}
            </button>

            <div className="mt-6 pt-4 border-t border-stone-700/60 text-center">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Lembrei minha senha! <strong>Voltar ao Login</strong></span>
              </button>
            </div>
          </form>
        )}

      </div>

      {/* First Access Password Change Modal */}
      {showFirstAccessModal && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-stone-800 border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-100">Troca Obrigatória de Senha</h3>
                <p className="text-xs text-stone-400">Primeiro acesso para {pendingUserName}</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-xs text-amber-200">
              Por razões de segurança, no seu primeiro acesso é necessário definir uma nova senha individual. Não é permitido o uso de senhas genéricas.
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Nova Senha Individual
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Salvar Nova Senha & Continuar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
