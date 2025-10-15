import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQueue } from '@/contexts/queue-hooks';
import { ArrowLeft, Plus, Pencil, Trash2, UserPlus, FileText, Utensils, Heart, Stethoscope, Pill, Activity, Users, Clipboard, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ServiceConfig } from '@/types/queue';

const ICON_OPTIONS = [
  { name: 'UserPlus', Icon: UserPlus },
  { name: 'FileText', Icon: FileText },
  { name: 'Utensils', Icon: Utensils },
  { name: 'Heart', Icon: Heart },
  { name: 'Stethoscope', Icon: Stethoscope },
  { name: 'Pill', Icon: Pill },
  { name: 'Activity', Icon: Activity },
  { name: 'Users', Icon: Users },
  { name: 'Clipboard', Icon: Clipboard },
  { name: 'Package', Icon: Package },
];

const COLOR_OPTIONS = [
  { name: 'Azul', value: 'primary' },
  { name: 'Verde', value: 'secondary' },
  { name: 'Laranja', value: 'accent' },
  { name: 'Vermelho', value: 'destructive' },
];

const ServiceManagement = () => {
  const navigate = useNavigate();
  const { services, addService, updateService, deleteService } = useQueue();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    prefix: '',
    icon: 'UserPlus',
    color: 'primary',
    paused: false,
    maxTickets: '' as number | '' | null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.prefix) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.prefix.length !== 2) {
      toast.error('O prefixo deve ter exatamente 2 caracteres');
      return;
    }

    const serviceData: ServiceConfig = {
      id: editingService?.id || `${formData.prefix.toLowerCase()}-${Date.now()}`,
      name: formData.name,
      prefix: formData.prefix.toUpperCase(),
      icon: formData.icon,
      color: formData.color,
      paused: !!formData.paused,
      maxTickets: formData.maxTickets === '' ? null : Number(formData.maxTickets),
    };

    if (editingService) {
      updateService(editingService.id, serviceData);
      toast.success('Serviço atualizado com sucesso!');
    } else {
      addService(serviceData);
      toast.success('Serviço cadastrado com sucesso!');
    }

    setIsDialogOpen(false);
    setEditingService(null);
    setFormData({ name: '', prefix: '', icon: 'UserPlus', color: 'primary', paused: false, maxTickets: '' });
  };

  const handleEdit = (service: ServiceConfig) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      prefix: service.prefix,
      icon: service.icon,
      color: service.color,
      paused: !!service.paused,
      maxTickets: typeof service.maxTickets === 'number' ? service.maxTickets : '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (serviceId: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      deleteService(serviceId);
      toast.success('Serviço excluído com sucesso!');
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingService(null);
    setFormData({ name: '', prefix: '', icon: 'UserPlus', color: 'primary', paused: false, maxTickets: '' });
  };

  return (
    <div id="conteudo" className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              size="icon"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold">Gerenciar Serviços</h1>
              <p className="text-muted-foreground">Cadastre e gerencie os tipos de atendimento</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" onClick={() => setEditingService(null)}>
                <Plus className="w-5 h-5 mr-2" />
                Novo Serviço
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Serviço *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Psicologia"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prefix">Prefixo (2 letras) *</Label>
                  <Input
                    id="prefix"
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value.slice(0, 2).toUpperCase() })}
                    placeholder="Ex: PS"
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="icon">Ícone</Label>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {ICON_OPTIONS.map(({ name, Icon }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: name })}
                        className={`p-3 rounded-md border-2 transition-all hover:bg-accent/10 ${
                          formData.icon === name 
                            ? 'border-primary bg-primary/10' 
                            : 'border-input bg-background'
                        }`}
                      >
                        <Icon className="w-6 h-6 mx-auto" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="color">Cor</Label>
                  <select
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    {COLOR_OPTIONS.map(color => (
                      <option key={color.value} value={color.value}>{color.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="paused">Pausar geração de senhas</Label>
                  <select
                    id="paused"
                    value={formData.paused ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, paused: e.target.value === 'true' })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="false">Ativo</option>
                    <option value="true">Pausado</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="maxTickets">Limite máximo de senhas (por dia)</Label>
                  <Input
                    id="maxTickets"
                    type="number"
                    min={0}
                    value={formData.maxTickets ?? ''}
                    onChange={(e) => setFormData({ ...formData, maxTickets: e.target.value ? Number(e.target.value) : '' })}
                    placeholder="Sem limite"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingService ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {services.map((service) => (
            <Card key={service.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-lg bg-${service.color}/10 flex items-center justify-center`}>
                    <span className="text-2xl font-bold text-foreground">{service.prefix}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Prefixo: {service.prefix} | Ícone: {service.icon}
                    </p>
                    {service.paused && (
                      <p className="text-xs mt-1 text-destructive">Geração de senhas pausada</p>
                    )}
                    {typeof service.maxTickets === 'number' && (
                      <p className="text-xs mt-1 text-muted-foreground">Limite diário: {service.maxTickets}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(service)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServiceManagement;
