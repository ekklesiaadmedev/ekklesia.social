import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/types/user';

export const TestUserList = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testListUsers = async () => {
    console.log('🧪 [TEST_USER_LIST] Iniciando teste de listagem...');
    setLoading(true);
    setError(null);
    
    try {
      const { RobustSupabaseAdmin } = await import('@/utils/supabaseAdmin');
      console.log('🧪 [TEST_USER_LIST] RobustSupabaseAdmin importado');
      
      const result = await RobustSupabaseAdmin.listUsers();
      console.log('🧪 [TEST_USER_LIST] Resultado:', result);
      
      if (result.success && result.data) {
        console.log('✅ [TEST_USER_LIST] Sucesso! Usuários:', result.data.length);
        setUsers(result.data);
      } else {
        console.error('❌ [TEST_USER_LIST] Erro:', result.error);
        setError(result.error || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('💥 [TEST_USER_LIST] Exceção:', err);
      setError('Erro na execução: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testListUsers();
  }, []);

  return (
    <Card className="p-4 mb-4">
      <h3 className="text-lg font-semibold mb-4">🧪 Teste de Listagem de Usuários</h3>
      
      <div className="flex gap-2 mb-4">
        <Button onClick={testListUsers} disabled={loading}>
          {loading ? 'Testando...' : 'Testar Novamente'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-red-700">❌ Erro: {error}</p>
        </div>
      )}

      {users.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="text-green-700 font-medium">✅ Sucesso! {users.length} usuários encontrados:</p>
          <ul className="mt-2 space-y-1">
            {users.slice(0, 3).map(user => (
              <li key={user.id} className="text-sm text-green-600">
                • {user.full_name || 'Sem nome'} ({user.email}) - {user.role}
              </li>
            ))}
            {users.length > 3 && (
              <li className="text-sm text-green-600">... e mais {users.length - 3} usuários</li>
            )}
          </ul>
        </div>
      )}
    </Card>
  );
};