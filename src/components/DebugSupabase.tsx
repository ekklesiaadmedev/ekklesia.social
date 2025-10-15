import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { RobustSupabaseAdmin } from '@/utils/supabaseAdmin';

type ResultEntry = { test: string; result: unknown; timestamp: string };

export const DebugSupabase = () => {
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, result: unknown) => {
    const timestamp = new Date().toISOString();
    console.log(`🔧 [DEBUG_COMPONENT] ${test} - ${timestamp}:`, result);
    setResults(prev => [...prev, { test, result, timestamp }]);
  };

  const testDirectQuery = async () => {
    setLoading(true);
    try {
      console.log('🔍 [DEBUG] Testando consulta direta à tabela profiles...');
      console.log('🔍 [DEBUG] URL do Supabase:', supabase.supabaseUrl);
      console.log('🔍 [DEBUG] Chave anon disponível:', !!supabase.supabaseKey);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('email', { ascending: true });
      
      console.log('📋 [DEBUG] Resultado da consulta direta:', { data, error });
      console.log('📋 [DEBUG] Quantidade de registros:', data?.length || 0);
      
      addResult('Consulta Direta Supabase', { 
        data, 
        error, 
        count: data?.length || 0,
        supabaseUrl: supabase.supabaseUrl,
        hasAnonKey: !!supabase.supabaseKey
      });
    } catch (e: unknown) {
      console.error('💥 [DEBUG] Erro na consulta direta:', e);
      addResult('Consulta Direta Supabase', { 
        error: (e as { message?: unknown })?.message ?? e, 
        stack: (e as { stack?: unknown })?.stack,
        name: (e as { name?: unknown })?.name
      });
    } finally {
      setLoading(false);
    }
  };

  const testRobustAdmin = async () => {
    setLoading(true);
    try {
      console.log('🔍 [DEBUG] Testando RobustSupabaseAdmin.listUsers...');
      const result = await RobustSupabaseAdmin.listUsers();
      console.log('📋 [DEBUG] Resultado do RobustSupabaseAdmin:', result);
      addResult('RobustSupabaseAdmin.listUsers', result);
    } catch (e: unknown) {
      console.error('💥 [DEBUG] Erro no RobustSupabaseAdmin:', e);
      addResult('RobustSupabaseAdmin.listUsers', { 
        error: (e as { message?: unknown })?.message ?? e, 
        stack: (e as { stack?: unknown })?.stack,
        name: (e as { name?: unknown })?.name
      });
    } finally {
      setLoading(false);
    }
  };

  const testEdgeFunction = async () => {
    setLoading(true);
    try {
      console.log('🔍 [DEBUG] Testando Edge Function admin-list-users...');
      const { data, error } = await supabase.functions.invoke('admin-list-users', { body: {} });
      console.log('📋 [DEBUG] Resultado da Edge Function:', { data, error });
      addResult('Edge Function admin-list-users', { data, error });
    } catch (e: unknown) {
      console.error('💥 [DEBUG] Erro na Edge Function:', e);
      addResult('Edge Function admin-list-users', { 
        error: (e as { message?: unknown })?.message ?? e, 
        stack: (e as { stack?: unknown })?.stack,
        name: (e as { name?: unknown })?.name
      });
    } finally {
      setLoading(false);
    }
  };

  const testCreateUser = async () => {
    setLoading(true);
    try {
      console.log('🔍 [DEBUG] Testando criação de usuário de teste...');
      const testEmail = `teste-${Date.now()}@example.com`;
      const { data, error } = await supabase.functions.invoke('admin-create-user', { 
        body: { 
          email: testEmail,
          password: 'teste123456',
          full_name: 'Usuário Teste',
          role: 'service'
        } 
      });
      console.log('📋 [DEBUG] Resultado da criação:', { data, error });
      addResult('Edge Function admin-create-user', { data, error, testEmail });
    } catch (e: unknown) {
      console.error('💥 [DEBUG] Erro na criação:', e);
      addResult('Edge Function admin-create-user', { 
        error: (e as { message?: unknown })?.message ?? e, 
        stack: (e as { stack?: unknown })?.stack,
        name: (e as { name?: unknown })?.name
      });
    } finally {
      setLoading(false);
    }
  };

  const testAuth = async () => {
    setLoading(true);
    try {
      console.log('🔍 [DEBUG] Testando estado de autenticação...');
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('📋 [DEBUG] Sessão atual:', { session, error });
      const roleFromSession = (() => {
        const um = ((session?.user?.user_metadata ?? {}) as Record<string, unknown>);
        const am = ((session?.user as unknown as { app_metadata?: Record<string, unknown> })?.app_metadata ?? {}) as Record<string, unknown>;
        const r = (typeof um['role'] === 'string' ? um['role'] : null) ?? (typeof am['role'] === 'string' ? am['role'] : null);
        return r ?? null;
      })();

      addResult('Estado de Autenticação', { 
        session: session ? {
          user: {
            id: session.user.id,
            email: session.user.email,
            role: roleFromSession
          },
          expires_at: session.expires_at
        } : null, 
        error 
      });
    } catch (e: unknown) {
      console.error('💥 [DEBUG] Erro na verificação de auth:', e);
      addResult('Estado de Autenticação', { 
        error: (e as { message?: unknown })?.message ?? e, 
        stack: (e as { stack?: unknown })?.stack,
        name: (e as { name?: unknown })?.name
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    console.log('🧹 [DEBUG] Resultados limpos');
  };

  return (
    <Card className="p-4 space-y-4 mb-6">
      <h3 className="text-lg font-semibold">🔧 Debug Supabase</h3>
      
      <div className="flex gap-2 flex-wrap">
        <Button onClick={testAuth} disabled={loading} size="sm" variant="outline">
          Teste Auth
        </Button>
        <Button onClick={testDirectQuery} disabled={loading} size="sm">
          Teste Consulta Direta
        </Button>
        <Button onClick={testRobustAdmin} disabled={loading} size="sm">
          Teste RobustAdmin
        </Button>
        <Button onClick={testEdgeFunction} disabled={loading} size="sm">
          Teste Edge Function
        </Button>
        <Button onClick={testCreateUser} disabled={loading} size="sm" variant="secondary">
          Teste Criar Usuário
        </Button>
        <Button onClick={clearResults} variant="outline" size="sm">
          Limpar
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">⏳ Executando teste...</p>}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {results.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum teste executado ainda. Clique nos botões acima para testar.</p>
        )}
        {results.map((result, index) => (
          <div key={index} className="border rounded p-3 text-xs">
            <div className="font-medium text-sm mb-1">
              {result.test} - {new Date(result.timestamp).toLocaleTimeString()}
            </div>
            <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded max-h-40 overflow-y-auto">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </Card>
  );
};