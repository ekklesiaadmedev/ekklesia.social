import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { InlineSpinner } from '@/components/ui/spinner';
import { validateAndNormalizeEmail, quickValidateEmail } from '@/utils/emailValidation';
import { createUserRobust } from '@/utils/userCreation';
import { updateUser } from '@/utils/userEditing';
import { RobustSupabaseAdmin } from '@/utils/supabaseAdmin';
import type { Profile, Role } from '@/types/user';

// Tipos de usuário agora centralizados em src/types/user.ts

const notifyError = (error: unknown, context: string) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`💥 ${context}:`, error);
  toast.error(`${context}: ${message}`);
};

const UserManagement = () => {
  console.log('🚀 [USER_MANAGEMENT] Componente UserManagement carregado!');
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('service');
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usedEdgeFallback, setUsedEdgeFallback] = useState(false);

  const VALID_ROLES = ['admin', 'triage', 'service', 'panel'] as const;

  // Edição de usuário
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<Role>('service');
  const [editSaving, setEditSaving] = useState(false);

  const loadProfiles = async () => {
    console.log('📋 [USER_MANAGEMENT] Iniciando loadProfiles');
    setLoading(true);
    setLoadError(null);
    
    try {
      console.log('🔍 [USER_MANAGEMENT] Tentando carregar usuários reais...');
      
      // Primeira tentativa: Query direta simples
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('email', { ascending: true });

      if (!profilesError && profilesData && profilesData.length > 0) {
        console.log('✅ [USER_MANAGEMENT] Query direta funcionou! Usuários encontrados:', profilesData.length);
        setProfiles(profilesData);
        setUsedEdgeFallback(false);
        return;
      }

      console.warn('⚠️ [USER_MANAGEMENT] Query direta falhou:', profilesError?.message);

      // Segunda tentativa: Edge Function
      console.log('🔍 [USER_MANAGEMENT] Tentando Edge Function admin-list-users');
      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-list-users', { body: {} });
      
      if (!fnError && fnData && typeof fnData === 'object' && 'profiles' in (fnData as Record<string, unknown>)) {
        const edgeProfiles = (fnData as { profiles: Profile[] }).profiles;
        if (Array.isArray(edgeProfiles) && edgeProfiles.length > 0) {
          console.log('✅ [USER_MANAGEMENT] Edge Function funcionou! Usuários encontrados:', edgeProfiles.length);
          setProfiles(edgeProfiles);
          setUsedEdgeFallback(true);
          return;
        }
      }

      console.warn('⚠️ [USER_MANAGEMENT] Edge Function também falhou:', { fnError, fnData });

      // Terceira tentativa: RobustSupabaseAdmin
      console.log('🔍 [USER_MANAGEMENT] Tentando RobustSupabaseAdmin.listUsers');
      const result = await RobustSupabaseAdmin.listUsers();
      
      if (result.success && result.data && result.data.length > 0) {
        console.log('✅ [USER_MANAGEMENT] RobustSupabaseAdmin funcionou! Usuários encontrados:', result.data.length);
        setProfiles(result.data);
        setUsedEdgeFallback(true);
        return;
      }

      // Se chegou até aqui, há um problema sério
      console.error('💥 [USER_MANAGEMENT] TODAS as tentativas falharam!');
      setLoadError('❌ Não foi possível carregar os usuários. Verifique as políticas RLS e permissões.');
      setProfiles([]);

    } catch (error) {
      console.error('💥 [USER_MANAGEMENT] Erro crítico na função loadProfiles:', error);
      setLoadError('Erro crítico ao carregar usuários: ' + (error as Error).message);
      setProfiles([]);
    } finally {
      console.log('📋 [USER_MANAGEMENT] Finalizando loadProfiles, setLoading(false)');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 [USER_MANAGEMENT] useEffect executado - iniciando carregamento');
    loadProfiles();
  }, []);

  useEffect(() => {
    console.log('🔍 [USER_MANAGEMENT] Estado profiles alterado:', {
      profilesCount: profiles.length,
      profiles: profiles.slice(0, 3),
      loading,
      loadError
    });
  }, [profiles, loading, loadError]);

  const openEdit = (p: Profile) => {
    setEditUser(p);
    setEditRole(VALID_ROLES.includes(p.role as Role) ? (p.role as Role) : 'service');
    setEditPassword('');
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    
    setEditSaving(true);
    try {
      console.log('🔄 [USER_MANAGEMENT] Iniciando edição do usuário:', { 
        userId: editUser.id, 
        currentRole: editUser.role, 
        newRole: editRole,
        hasPassword: editPassword.trim().length > 0 
      });
      
      // Preparar parâmetros de atualização
      const updateParams: {
        userId: string;
        role?: Role;
        password?: string;
      } = {
        userId: editUser.id
      };
      
      // Adicionar papel se alterado
      if (editRole !== editUser.role) {
        updateParams.role = editRole;
      }
      
      // Adicionar senha se preenchida
      if (editPassword.trim().length > 0) {
        updateParams.password = editPassword.trim();
      }
      
      // Verificar se há algo para atualizar
      if (!updateParams.role && !updateParams.password) {
        toast.info('Nenhuma alteração detectada');
        setEditOpen(false);
        setEditUser(null);
        setEditPassword('');
        return;
      }
      
      // Executar atualização usando a nova função robusta
      const result = await updateUser(updateParams);
      
      if (result.success) {
        let message = 'Usuário atualizado com sucesso';
        if (result.warning) {
          message += ` (Aviso: ${result.warning})`;
        }
        toast.success(message);
        
        // Limpar formulário e recarregar lista
        setEditOpen(false);
        setEditUser(null);
        setEditPassword('');
        await loadProfiles();
        
      } else {
        console.error('❌ [USER_MANAGEMENT] Falha na edição:', result.error);
        // 🔧 [FIX] Melhorar feedback de erro com detalhes
        const errorMsg = `Erro ao atualizar usuário: ${result.error}`;
        const warningMsg = result.warning ? `\n\nAvisos: ${result.warning}` : '';
        
        toast.error(errorMsg + warningMsg, {
          duration: 8000, // Mais tempo para ler mensagens longas
          style: {
            maxWidth: '500px',
            fontSize: '14px'
          }
        });
        
        console.error('❌ [USER_MANAGEMENT] Erro na atualização:', {
          error: result.error,
          warning: result.warning,
          strategy: result.strategy
        });
      }
      
    } catch (error: unknown) {
      console.error('💥 [USER_MANAGEMENT] Erro crítico na edição:', error);
      notifyError(error, 'Erro crítico ao atualizar usuário');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteUser = async (id: string) => {
    const confirmed = window.confirm('Tem certeza que deseja excluir este usuário? Esta ação é permanente.');
    if (!confirmed) return;
    
    try {
      const { RobustSupabaseAdmin } = await import('@/utils/supabaseAdmin');
      const result = await RobustSupabaseAdmin.deleteUser(id);
      
      if (result.ok) {
        if (result.warning) {
          toast.success(`Usuário excluído com aviso: ${result.warning}`);
        } else {
          toast.success('Usuário excluído com sucesso');
        }
        await loadProfiles(); // Recarrega a lista
        return true;
      } else {
        toast.error(`Erro ao excluir usuário: ${result.error}`);
        return false;
      }
    } catch (error: unknown) {
      console.error('💥 Erro crítico ao excluir usuário:', error);
      notifyError(error, 'Erro crítico ao excluir usuário');
      return false;
    }
  };

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase();
    return (p.email ?? '').toLowerCase().includes(q) || (p.full_name ?? '').toLowerCase().includes(q);
  });

  console.log('🔍 [USER_MANAGEMENT] Renderização:', {
    profilesCount: profiles.length,
    filteredCount: filtered.length,
    loading,
    loadError,
    searchTerm: search
  });

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h2 className="text-2xl font-semibold mb-4">Pesquisar usuários</h2>
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="text-sm text-muted-foreground mt-2">
          {filtered.length} usuário(s) encontrado(s) {search && `para "${search}"`}
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="text-2xl font-semibold mb-4">Cadastrar usuário</h2>
        <div className="text-sm text-muted-foreground mb-4">
          Cadastre usuários diretamente aqui e atribua o papel. Papéis: "Administrador", "Atendente Triagem" (Gerar Senha) e "Atendente Serviço" (Atendente). Caso a confirmação de e-mail esteja habilitada no Supabase, o usuário deve confirmar para acessar.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label>E-mail</Label>
            <Input type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Nome completo</Label>
            <Input placeholder="Nome do usuário" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Senha temporária</Label>
            <Input type="password" placeholder="Defina uma senha" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <Label>Papel</Label>
            <Select value={role} onValueChange={(val) => setRole(val as Role)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service">Atendente Serviço</SelectItem>
                <SelectItem value="triage">Atendente Triagem</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="panel">Painel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              disabled={creating || !email.trim() || !password.trim()} 
              className="flex items-center gap-2"
              onClick={async () => {
                // DEBUG: Verificar valores dos campos
                console.log('🔍 [DEBUG] Valores do formulário:', {
                  email: email,
                  emailType: typeof email,
                  emailLength: email?.length,
                  password: password ? '[DEFINIDA]' : '[VAZIA]',
                  fullName: fullName,
                  role: role
                });
                
                if (!email || !password) { 
                  toast.error('Informe e-mail e senha'); 
                  return; 
                }
                if (password.length < 6) { 
                  toast.error('Senha muito curta (mínimo 6 caracteres)'); 
                  return; 
                }
                
                // NOVA VALIDAÇÃO ROBUSTA E PERMISSIVA
                console.log('🔍 [DEBUG] Validando email:', email);
                const emailValidation = validateAndNormalizeEmail(email);
                console.log('🔍 [DEBUG] Resultado da validação:', emailValidation);
                
                if (!emailValidation.isValid) {
                  const errorMessage = emailValidation.errors.length > 0 ? emailValidation.errors[0] : 'Formato inválido';
                  console.log('❌ [DEBUG] Email inválido:', { email, errorMessage, errors: emailValidation.errors });
                  toast.error(`E-mail inválido: ${errorMessage}`);
                  return;
                }
                
                setCreating(true);
                
                try {
                  console.log('🔄 [USER_CREATION] Iniciando criação de usuário...');
                  const result = await createUserRobust({
                    email: emailValidation.normalizedEmail,
                    fullName: fullName.trim() || null,
                    password,
                    role
                  });
                  
                  if (result.success) {
                    console.log('✅ [USER_CREATION] Usuário criado com sucesso:', result);
                    toast.success(`Usuário ${emailValidation.normalizedEmail} criado com sucesso!`);
                    
                    // Limpar formulário
                    setEmail(''); 
                    setFullName(''); 
                    setPassword(''); 
                    setRole('service');
                    await loadProfiles();
                    
                  } else {
                    console.error('❌ [USER_CREATION] Falha na criação:', result);
                    
                    // Melhorar feedback de erro para o usuário
                    let userFriendlyError = result.error || 'Erro desconhecido';
                    
                    // Tratar erros específicos com mensagens mais amigáveis
                    if (userFriendlyError.includes('already exists') || userFriendlyError.includes('already registered')) {
                      userFriendlyError = `O e-mail "${emailValidation.normalizedEmail}" já está cadastrado no sistema`;
                    } else if (userFriendlyError.includes('invalid')) {
                      userFriendlyError = `O e-mail "${emailValidation.normalizedEmail}" não é válido`;
                    } else if (userFriendlyError.includes('Falha em todas as estratégias')) {
                      userFriendlyError = 'Não foi possível criar o usuário. Tente novamente em alguns instantes';
                    }
                    
                    toast.error(userFriendlyError);
                  }
                  
                } catch (error: unknown) {
                  console.error('💥 [USER_CREATION] Erro crítico:', error);
                  notifyError(error, 'Erro crítico ao criar usuário');
                } finally {
                  setCreating(false);
                }
              }}>
              {creating && <InlineSpinner size="sm" />}
              {creating ? 'Criando...' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      </Card>

      {loadError && (
        <Card className="p-4 border border-destructive text-destructive bg-destructive/5">
          <h3 className="font-semibold mb-2">Erro ao carregar usuários</h3>
          <p className="text-sm">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={loadProfiles}>
            Tentar novamente
          </Button>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="text-2xl font-semibold mb-4">Lista de usuários</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <InlineSpinner size="md" text="Carregando usuários..." />
          </div>
        ) : (
          <div className="space-y-3">
            {usedEdgeFallback && (
              <p className="text-xs text-muted-foreground">Fonte dos dados: Edge Function (fallback)</p>
            )}
            {filtered.length === 0 && !search && !loadError && (
              <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
            )}
            {filtered.length === 0 && search && <p className="text-muted-foreground">Nenhum usuário encontrado para "{search}"</p>}
            {filtered.map((p) => (
              <div key={p.id} className="grid grid-cols-1 md:grid-cols-4 items-center gap-3 border rounded p-3">
                <div>
                  <p className="font-medium">{p.full_name || 'Sem nome'}</p>
                  <p className="text-sm text-muted-foreground">{p.email || 'Sem e-mail'}</p>
                </div>
                <div>
                  <Label>Papel</Label>
                  <div className="text-sm font-medium capitalize">
                    {p.role === 'admin' ? 'Administrador' : 
                     p.role === 'triage' ? 'Atendente Triagem' : 
                     p.role === 'service' ? 'Atendente Serviço' : 
                     p.role === 'panel' ? 'Painel' : p.role}
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2">
                  <span className="text-sm text-muted-foreground">ID: {p.id}</span>
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>Editar</Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteUser(p.id)}>Excluir</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nome</Label>
                <Input value={editUser.full_name ?? ''} disabled />
              </div>
              <div className="md:col-span-2">
                <Label>E-mail</Label>
                <Input value={editUser.email ?? ''} disabled />
              </div>
              <div>
                <Label>Nova senha</Label>
                <Input type="password" placeholder="Defina uma nova senha" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
              </div>
              <div>
                <Label>Papel</Label>
                <Select value={editRole} onValueChange={(val) => setEditRole(val as Role)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Atendente Serviço</SelectItem>
                    <SelectItem value="triage">Atendente Triagem</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="panel">Painel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="flex items-center gap-2">
              {editSaving && <InlineSpinner size="sm" />}
              {editSaving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;