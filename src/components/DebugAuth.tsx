import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DebugResult {
  test: string;
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

export const DebugAuth: React.FC = () => {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('social@ekklesia.com');
  const [testPassword, setTestPassword] = useState('');
  const { user, profile, isAdmin, session } = useAuth();

  const addResult = (test: string, success: boolean, data?: unknown, error?: string) => {
    const result: DebugResult = {
      test,
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    };
    setResults(prev => [result, ...prev]);
    console.log(`🔍 [DEBUG_AUTH] ${test}:`, result);
  };

  const testCurrentAuthState = async () => {
    setLoading(true);
    try {
      console.log('🔍 [DEBUG_AUTH] Testando estado atual da autenticação...');
      
      // 1. Estado do AuthContext
      addResult('AuthContext State', true, {
        hasUser: !!user,
        hasSession: !!session,
        hasProfile: !!profile,
        isAdmin,
        userEmail: user?.email,
        profileRole: profile?.role,
        userId: user?.id
      });

      // 2. Sessão direta do Supabase
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      addResult('Supabase Session', !sessionError, sessionData, sessionError?.message);

      // 3. Consulta direta à tabela profiles
      if (user?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        addResult('Direct Profile Query', !profileError, profileData, profileError?.message);
      }

      // 4. Teste de políticas RLS - listar todos os profiles
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .limit(5);
      
      addResult('List Profiles (RLS Test)', !allProfilesError, allProfiles, allProfilesError?.message);

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addResult('Auth State Test', false, undefined, msg);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    if (!testEmail || !testPassword) {
      toast.error('Preencha email e senha para teste');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 [DEBUG_AUTH] Testando login com:', testEmail);
      
      // 1. Tentar login
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail.trim().toLowerCase(),
        password: testPassword.trim()
      });
      
      addResult('Login Attempt', !loginError, {
        hasUser: !!loginData.user,
        hasSession: !!loginData.session,
        userEmail: loginData.user?.email,
        userConfirmed: loginData.user?.email_confirmed_at ? 'Confirmed' : 'Not Confirmed'
      }, loginError?.message);

      // 2. Se login funcionou, verificar perfil
      if (loginData.user && !loginError) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', loginData.user.id)
          .single();
        
        addResult('Profile After Login', !profileError, profileData, profileError?.message);
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addResult('Login Test', false, undefined, msg);
    } finally {
      setLoading(false);
    }
  };

  const testEdgeFunctions = async () => {
    setLoading(true);
    try {
      console.log('🔍 [DEBUG_AUTH] Testando Edge Functions...');
      
      // 1. Testar admin-list-users
      const { data: listData, error: listError } = await supabase.functions.invoke('admin-list-users', {
        body: {}
      });
      addResult('Edge Function: admin-list-users', !listError, listData, listError?.message);

      // 2. Testar admin-create-user (usuário de teste)
      const testUserEmail = `debug-test-${Date.now()}@example.com`;
      const { data: createData, error: createError } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: testUserEmail,
          password: 'debug123456',
          full_name: 'Debug Test User',
          role: 'service'
        }
      });
      addResult('Edge Function: admin-create-user', !createError, createData, createError?.message);

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addResult('Edge Functions Test', false, undefined, msg);
    } finally {
      setLoading(false);
    }
  };

  const testRLSPolicies = async () => {
    setLoading(true);
    try {
      console.log('🔍 [DEBUG_AUTH] Testando políticas RLS...');
      
      // 1. Testar como usuário anônimo
      const { data: anonData, error: anonError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .limit(3);
      
      addResult('RLS: Anonymous Access', !anonError, anonData, anonError?.message);

      // 2. Testar inserção (deve falhar para não-admin)
      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: '00000000-0000-0000-0000-000000000000', // UUID fake
          email: 'test-rls@example.com',
          role: 'service'
        });
      
      addResult('RLS: Insert Test (should fail)', !insertError, insertData, insertError?.message);

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addResult('RLS Policies Test', false, undefined, msg);
    } finally {
      setLoading(false);
    }
  };

  const testCreateAdminProfile = async () => {
    setLoading(true);
    try {
      console.log('🔍 [DEBUG_AUTH] Testando criação de perfil admin...');
      
      // Verificar se usuário social@ekklesia.com existe
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      const socialUser = userData?.users?.find(u => u.email === 'social@ekklesia.com');
      
      addResult('Check social@ekklesia.com in auth.users', !!socialUser, {
        userExists: !!socialUser,
        userId: socialUser?.id,
        emailConfirmed: socialUser?.email_confirmed_at ? 'Yes' : 'No'
      }, userError?.message);

      if (socialUser) {
        // Tentar criar/atualizar perfil
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: socialUser.id,
            email: 'social@ekklesia.com',
            full_name: 'Administrador Social',
            role: 'admin'
          })
          .select()
          .single();
        
        addResult('Create/Update Admin Profile', !profileError, profileData, profileError?.message);
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addResult('Create Admin Profile Test', false, undefined, msg);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">🔍 Debug de Autenticação</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ferramenta de diagnóstico para identificar problemas de autenticação e permissões.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label>Email para teste de login</Label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <Label>Senha para teste de login</Label>
            <Input
              type="password"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              placeholder="senha"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button onClick={testCurrentAuthState} disabled={loading} variant="outline">
            Estado Atual
          </Button>
          <Button onClick={testLogin} disabled={loading} variant="outline">
            Testar Login
          </Button>
          <Button onClick={testEdgeFunctions} disabled={loading} variant="outline">
            Edge Functions
          </Button>
          <Button onClick={testRLSPolicies} disabled={loading} variant="outline">
            Políticas RLS
          </Button>
          <Button onClick={testCreateAdminProfile} disabled={loading} variant="destructive">
            Criar Perfil Admin
          </Button>
          <Button onClick={clearResults} disabled={loading} variant="ghost">
            Limpar
          </Button>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground mt-2">Executando testes...</p>
          </div>
        )}
      </Card>

      {results.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Resultados dos Testes</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">
                    {result.success ? '✅' : '❌'} {result.test}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                {result.error && (
                  <p className="text-sm text-red-600 mb-2">
                    <strong>Erro:</strong> {result.error}
                  </p>
                )}
                
                {result.data && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">
                      Ver dados
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};