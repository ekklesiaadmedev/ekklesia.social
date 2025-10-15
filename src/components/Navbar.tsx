import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, Home, Ticket, LayoutDashboard, Headphones, Cog } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "../../anexos/logo_min_ekklesia.png";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, profileLoaded, signOut, isAdmin, isTriage, isService, profile } = useAuth();
  
  // 🔧 [DEBUG] Logs detalhados para debug do estado da navbar
  console.log('🔍 [NAVBAR DEBUG] Estado completo:', {
    user: !!user,
    userEmail: user?.email,
    loading,
    profileLoaded,
    isAdmin,
    isTriage,
    isService,
    profileRole: profile?.role,
    profileData: profile
  });

  // 🔧 [FIX] Lógica mais robusta para disabled - não bloquear se temos usuário e perfil admin
  const disabled = loading || !user || (!profileLoaded && !isAdmin);
  
  console.log('🔍 [NAVBAR DEBUG] Disabled:', disabled, 'Motivos:', {
    loading,
    noUser: !user,
    noProfileAndNotAdmin: !profileLoaded && !isAdmin,
    profileLoaded,
    isAdmin
  });

  // 🔧 [DEBUG] Log específico para condições de exibição dos menus
  console.log('🔍 [NAVBAR DEBUG] Condições de menu:', {
    showGerarSenha: isAdmin || isTriage,
    showAtendente: isAdmin || isService,
    showServicos: isAdmin,
    showRelatorios: isAdmin,
    showAdministracao: isAdmin
  });

  const go = (path: string) => () => (disabled ? null : navigate(path));

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b bg-background">
      <div className="mx-auto max-w-7xl flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Ministério Ekklesia" className="h-8 w-auto" />
          <span className="text-sm text-muted-foreground">Ekklesia Social</span>
        </div>

        <a href="#conteudo" className="skip-link">Ir para o conteúdo</a>
        <Menubar className="hidden md:flex">
          <MenubarMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <MenubarTrigger
                  onClick={go('/')}
                  className={cn(
                    'flex items-center gap-2',
                    disabled && 'opacity-60 cursor-not-allowed',
                    isActive('/') && 'bg-muted font-medium'
                  )}
                  aria-current={isActive('/') ? 'page' : undefined}
                >
                  <Home className="w-4 h-4" /> Home
                </MenubarTrigger>
              </TooltipTrigger>
              {disabled && <TooltipContent>Faça login para acessar</TooltipContent>}
            </Tooltip>
          </MenubarMenu>
          
          {/* 🔧 [DEBUG] Gerar Senha - para admin/triage com log */}
          {(() => {
            const shouldShow = isAdmin || isTriage;
            console.log('🔍 [NAVBAR DEBUG] Gerar Senha - shouldShow:', shouldShow, 'isAdmin:', isAdmin, 'isTriage:', isTriage);
            return shouldShow;
          })() && (
            <MenubarMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MenubarTrigger
                    onClick={go('/gerar-senha')}
                    className={cn(
                      'flex items-center gap-2',
                      disabled && 'opacity-60 cursor-not-allowed',
                      isActive('/gerar-senha') && 'bg-muted font-medium'
                    )}
                    aria-current={isActive('/gerar-senha') ? 'page' : undefined}
                  >
                    <Ticket className="w-4 h-4" /> Gerar Senha
                  </MenubarTrigger>
                </TooltipTrigger>
                {disabled && <TooltipContent>Faça login para acessar</TooltipContent>}
              </Tooltip>
            </MenubarMenu>
          )}
          
          {/* 🔧 [FIX] Painel - sempre visível para usuários logados */}
          <MenubarMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <MenubarTrigger
                  onClick={go('/painel')}
                  className={cn(
                    'flex items-center gap-2',
                    disabled && 'opacity-60 cursor-not-allowed',
                    isActive('/painel') && 'bg-muted font-medium'
                  )}
                  aria-current={isActive('/painel') ? 'page' : undefined}
                >
                  <LayoutDashboard className="w-4 h-4" /> Painel
                </MenubarTrigger>
              </TooltipTrigger>
              {disabled && <TooltipContent>Faça login para acessar</TooltipContent>}
            </Tooltip>
          </MenubarMenu>
          
          {/* 🔧 [DEBUG] Atendente - para admin/service com log */}
          {(() => {
            const shouldShow = isAdmin || isService;
            console.log('🔍 [NAVBAR DEBUG] Atendente - shouldShow:', shouldShow, 'isAdmin:', isAdmin, 'isService:', isService);
            return shouldShow;
          })() && (
            <MenubarMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MenubarTrigger
                    onClick={go('/atendente')}
                    className={cn(
                      'flex items-center gap-2',
                      disabled && 'opacity-60 cursor-not-allowed',
                      isActive('/atendente') && 'bg-muted font-medium'
                    )}
                    aria-current={isActive('/atendente') ? 'page' : undefined}
                  >
                    <Headphones className="w-4 h-4" /> Atendente
                  </MenubarTrigger>
                </TooltipTrigger>
                {disabled && <TooltipContent>Faça login para acessar</TooltipContent>}
              </Tooltip>
            </MenubarMenu>
          )}
          
          {/* 🔧 [DEBUG] Serviços - só para admin com log */}
          {(() => {
            const shouldShow = isAdmin;
            console.log('🔍 [NAVBAR DEBUG] Serviços - shouldShow:', shouldShow, 'isAdmin:', isAdmin);
            return shouldShow;
          })() && (
            <MenubarMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MenubarTrigger
                    onClick={go('/servicos')}
                    className={cn(
                      'flex items-center gap-2',
                      disabled && 'opacity-60 cursor-not-allowed',
                      isActive('/servicos') && 'bg-muted font-medium'
                    )}
                    aria-current={isActive('/servicos') ? 'page' : undefined}
                  >
                    <Cog className="w-4 h-4" /> Serviços
                  </MenubarTrigger>
                </TooltipTrigger>
                {disabled && <TooltipContent>Faça login para acessar</TooltipContent>}
              </Tooltip>
            </MenubarMenu>
          )}
          
          {/* 🔧 [DEBUG] Relatórios - só para admin com log */}
          {(() => {
            const shouldShow = isAdmin;
            console.log('🔍 [NAVBAR DEBUG] Relatórios - shouldShow:', shouldShow, 'isAdmin:', isAdmin);
            return shouldShow;
          })() && (
            <MenubarMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MenubarTrigger 
                    onClick={go('/relatorios')} 
                    className={cn(
                      'flex items-center gap-2',
                      disabled && 'opacity-60 cursor-not-allowed',
                      isActive('/relatorios') && 'bg-muted font-medium'
                    )}
                    aria-current={isActive('/relatorios') ? 'page' : undefined}
                  >
                    Relatórios
                  </MenubarTrigger>
                </TooltipTrigger>
                {disabled && <TooltipContent>Faça login para acessar</TooltipContent>}
              </Tooltip>
            </MenubarMenu>
          )}
          
          {/* 🔧 [DEBUG] Administração - só para admin com log */}
          {(() => {
            const shouldShow = isAdmin;
            console.log('🔍 [NAVBAR DEBUG] Administração - shouldShow:', shouldShow, 'isAdmin:', isAdmin);
            return shouldShow;
          })() && (
            <MenubarMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MenubarTrigger 
                    onClick={go('/admin')} 
                    className={cn(
                      'flex items-center gap-2',
                      disabled && 'opacity-60 cursor-not-allowed',
                      isActive('/admin') && 'bg-muted font-medium'
                    )}
                    aria-current={isActive('/admin') ? 'page' : undefined}
                  >
                    Administração
                  </MenubarTrigger>
                </TooltipTrigger>
                {disabled && <TooltipContent>Faça login para acessar</TooltipContent>}
              </Tooltip>
            </MenubarMenu>
          )}
        </Menubar>

        {user ? (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => { 
              try {
                const { error } = await signOut();
                if (error) {
                  console.error('Erro no logout:', error);
                }
                // Força navegação para login independente do resultado
                navigate('/login');
                // Força reload da página para limpar qualquer estado residual
                window.location.reload();
              } catch (err) {
                console.error('Erro inesperado no logout:', err);
                // Mesmo com erro, navega para login
                navigate('/login');
                window.location.reload();
              }
            }}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
            <LogIn className="w-4 h-4 mr-2" /> Login
          </Button>
        )}
      </div>
    </header>
  );
}