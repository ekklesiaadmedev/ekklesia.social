import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody } from '@/components/ui/table';
import { useState, useMemo } from 'react';

type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | unknown[] | string | number | boolean | null;
  created_at: string;
};

const AuditLogs = () => {
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['audit_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const filtered = useMemo(() => {
    const items = data ?? [];
    return items.filter((l) => {
      const matchesAction = actionFilter ? l.action === actionFilter : true;
      const matchesEntity = entityFilter ? l.entity === entityFilter : true;
      const q = search.toLowerCase();
      const matchesSearch = q
        ? (l.actor_email ?? '').toLowerCase().includes(q) ||
          (l.entity ?? '').toLowerCase().includes(q) ||
          (l.entity_id ?? '').toLowerCase().includes(q)
        : true;
      return matchesAction && matchesEntity && matchesSearch;
    });
  }, [data, actionFilter, entityFilter, search]);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Ação</Label>
            <Input placeholder="insert|update|delete|sign_up" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
          </div>
          <div>
            <Label>Entidade</Label>
            <Input placeholder="services|tickets|profiles|auth.users" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Buscar</Label>
            <Input placeholder="E-mail, entidade ou id" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>Atualizar</Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Id</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((l) => (
                <TableRow key={l.id}>
                  <td className="whitespace-nowrap">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                  <td className="uppercase whitespace-nowrap">{l.action}</td>
                  <td className="whitespace-nowrap">{l.entity}</td>
                  <td className="whitespace-nowrap">{l.entity_id}</td>
                  <td className="whitespace-nowrap">{l.actor_email || l.actor_id || '-'}</td>
                  <td className="max-w-[500px] truncate text-muted-foreground">
                    {typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details)}
                  </td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered?.length === 0 && (
            <p className="text-muted-foreground">Nenhum registro de auditoria encontrado com os filtros atuais.</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AuditLogs;