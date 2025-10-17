import { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/user';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  profileLoaded: boolean;
  isAdmin: boolean;
  isTriage: boolean;
  isService: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>; 
  signOut: () => Promise<{ error: unknown }>; 
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const resolveRoleFromMetadata = (u: User): Profile['role'] | null => {
  const metadata = u.user_metadata || {};
  const appMetadata = u.app_metadata || {};
  
  if (metadata.role) return metadata.role as Profile['role'];
  if (appMetadata.role) return appMetadata.role as Profile['role'];
  if (metadata.user_role) return metadata.user_role as Profile['role'];
  if (appMetadata.user_role) return appMetadata.user_role as Profile['role'];
  
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Cache e controle de carregamento
  const profileCache = useRef(new Map<string, { profile: Profile; timestamp: number }>());
  const loadingProfile = useRef<string | null>(null);
  const initialized = useRef(false);
  const authTimeout = useRef<NodeJS.Timeout | null>(null);
  const forceLoadTimeout = useRef<NodeJS.Timeout | null>(null);

  // Configurações
  const ADMIN_EMAILS = useMemo(() => {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL ?? 'admin@ekklesia.com';
    return adminEmail.split(',').map(e => e.trim().toLowerCase());
  }, []);

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  const AUTH_TIMEOUT = 3000; // 3 segundos
  const FORCE_LOAD_TIMEOUT = 2000; // 2 segundos

  const forceLoadComplete = useCallback(() => {
    console.log('🚨 FORÇANDO CARREGAMENTO COMPLETO!');
    setLoading(false);
    setProfileLoaded(true);
    if (authTimeout.current) {
      clearTimeout(authTimeout.current);
      authTimeout.current = null;
    }
    if (forceLoadTimeout.current) {
      clearTimeout(forceLoadTimeout.current);
      forceLoadTimeout.current = null;
    }
  }, []);

  // Função SIMPLIFICADA para carregar perfil
  const loadProfile = useCallback(async (u: User) => {
    if (!u) {
      console.log('❌ Usuário nulo, pulando carregamento de perfil');
      return;
    }
    
    console.log('🔍 Carregando perfil para usuário:', u.id, u.email);
    
    // Verifica cache primeiro
    const cached = profileCache.current.get(u.id);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('✅ Perfil encontrado no cache');
      setProfile(cached.profile);
      setProfileLoaded(true);
      return;
    }

    // Evita múltiplas requisições
    if (loadingProfile.current === u.id) {
      console.log('⏳ Já carregando perfil, ignorando...');
      return;
    }

    loadingProfile.current = u.id;

    // CORREÇÃO CRÍTICA: Criar perfil fallback IMEDIATAMENTE para painel@ekklesia.com
    const email = (u.email ?? '').toLowerCase();
    if (email === 'painel@ekklesia.com') {
      console.log('🎯 [CORREÇÃO CRÍTICA] Criando perfil panel para painel@ekklesia.com IMEDIATAMENTE');
      const panelProfile: Profile = {
        id: u.id,
        email: u.email ?? null,
        full_name: 'Usuário do Painel',
        role: 'panel',
      };
      
      profileCache.current.set(u.id, { 
        profile: panelProfile, 
        timestamp: Date.now() 
      });
      setProfile(panelProfile);
      setProfileLoaded(true);
      loadingProfile.current = null;
      return;
    }

    try {
      console.log('📡 Consultando perfil no banco...');
      
      // CORREÇÃO: Usar timeout mais longo e melhor tratamento de erro
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single();

      console.log('🔍 [DEBUG] Resposta do banco:', { data, error });

      if (data && !error) {
        console.log('✅ Perfil carregado do banco:', data);
        let profileData = data as Profile;
        
        // Verifica admin
        if (email && ADMIN_EMAILS.includes(email) && profileData.role !== 'admin') {
          profileData = { ...profileData, role: 'admin' };
          console.log('👑 Promovendo usuário para admin');
        }

        console.log('🎯 [DEBUG] Perfil final a ser definido:', profileData);

        profileCache.current.set(u.id, { 
          profile: profileData, 
          timestamp: Date.now() 
        });
        setProfile(profileData);
        setProfileLoaded(true);
        loadingProfile.current = null;
        return;
      } else {
        console.warn('⚠️ Erro ao carregar perfil do banco:', error);
      }
    } catch (e) {
      console.warn('⚠️ Exceção ao carregar perfil, usando fallback:', e);
    }

    // Fallback IMEDIATO
    console.log('🔄 Usando fallback para perfil...');
    const metaRole = resolveRoleFromMetadata(u);
    let fallbackRole: Profile['role'] = 'user';
    
    // CORREÇÃO: Verificar se é usuário painel@ekklesia.com
    if (email === 'painel@ekklesia.com') {
      fallbackRole = 'panel';
      console.log('🎯 [CORREÇÃO] Definindo role panel para painel@ekklesia.com');
    } else if (email && ADMIN_EMAILS.includes(email)) {
      fallbackRole = 'admin';
    } else if (metaRole) {
      fallbackRole = metaRole;
    }

    const fullNameRaw = ((u.user_metadata ?? {}) as Record<string, unknown>)['full_name'];
    const fullName = typeof fullNameRaw === 'string' ? fullNameRaw : (fallbackRole === 'admin' ? 'Administrador' : fallbackRole === 'panel' ? 'Painel' : null);
    const fallbackProfile: Profile = {
      id: u.id,
      email: u.email ?? null,
      full_name: fullName,
      role: fallbackRole,
    };

    console.log('✅ Perfil fallback criado:', fallbackProfile);

    profileCache.current.set(u.id, { 
      profile: fallbackProfile, 
      timestamp: Date.now() 
    });
    setProfile(fallbackProfile);
    setProfileLoaded(true);
    loadingProfile.current = null;
  }, [ADMIN_EMAILS, CACHE_TTL]);

  useEffect(() => {
    console.log('🔄 AuthProvider useEffect iniciando...');
    let mounted = true;

    // TIMEOUT SUPER AGRESSIVO - 2 segundos para forçar carregamento
    forceLoadTimeout.current = setTimeout(() => {
      console.error('🚨 TIMEOUT DE 2 SEGUNDOS - FORÇANDO CARREGAMENTO AGORA!');
      forceLoadComplete();
    }, FORCE_LOAD_TIMEOUT);

    // Timeout de segurança adicional
    authTimeout.current = setTimeout(() => {
      console.error('🚨 TIMEOUT DE 3 SEGUNDOS - FORÇANDO CARREGAMENTO!');
      forceLoadComplete();
    }, AUTH_TIMEOUT);

    const initializeAuth = async () => {
      if (initialized.current) {
        console.log('⚠️ Auth já inicializado, pulando...');
        return;
      }
      initialized.current = true;

      console.log('🚀 Inicializando autenticação...');

      try {
        // Timeout MUITO agressivo para getSession
        console.log('📡 Obtendo sessão...');
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session timeout')), 1500); // 1.5 segundos apenas
        });

        const sessionRace = await Promise.race([sessionPromise, timeoutPromise]) as unknown;
        const { data: { session: currentSession } = { session: null }, error } = (sessionRace && typeof sessionRace === 'object' && 'data' in sessionRace)
          ? (sessionRace as { data: { session: Session | null }; error: unknown })
          : { data: { session: null }, error: new Error('Session timeout') };
        
        if (!mounted) return;

        console.log('📋 Sessão obtida:', currentSession ? 'ENCONTRADA' : 'NÃO ENCONTRADA');

        if (currentSession && !error) {
          console.log('✅ Usuário logado:', currentSession.user.id, currentSession.user.email);
          setSession(currentSession);
          setUser(currentSession.user);
          // Carrega perfil de forma assíncrona
          loadProfile(currentSession.user);
        } else {
          console.log('❌ Nenhuma sessão ativa');
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileLoaded(true);
        }
      } catch (error) {
        console.error('💥 Erro na inicialização, usando estado padrão:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoaded(true);
      } finally {
        if (mounted) {
          console.log('✅ Finalizando carregamento de auth');
          setLoading(false);
          if (authTimeout.current) {
            clearTimeout(authTimeout.current);
            authTimeout.current = null;
          }
          if (forceLoadTimeout.current) {
            clearTimeout(forceLoadTimeout.current);
            forceLoadTimeout.current = null;
          }
        }
      }
    };

    // Listener para mudanças de autenticação
    console.log('👂 Configurando listener de auth...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('🔄 Auth state change:', event, session?.user?.id || 'NO_USER');

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('👤 Usuário logado, carregando perfil...');
        loadProfile(session.user);
      } else {
        console.log('👤 Usuário deslogado');
        setProfile(null);
        setProfileLoaded(true);
        profileCache.current.clear();
        loadingProfile.current = null;
      }

      if (mounted) {
        setLoading(false);
        if (authTimeout.current) {
          clearTimeout(authTimeout.current);
          authTimeout.current = null;
        }
        if (forceLoadTimeout.current) {
          clearTimeout(forceLoadTimeout.current);
          forceLoadTimeout.current = null;
        }
      }
    });

    initializeAuth();

    return () => {
      console.log('🧹 Limpando AuthProvider...');
      mounted = false;
      subscription.unsubscribe();
      if (authTimeout.current) {
        clearTimeout(authTimeout.current);
        authTimeout.current = null;
      }
      if (forceLoadTimeout.current) {
        clearTimeout(forceLoadTimeout.current);
        forceLoadTimeout.current = null;
      }
    };
  }, [loadProfile, forceLoadComplete]);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔐 Tentando login para:', email);
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedPassword = (password || '').trim();
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email: normalizedEmail, 
      password: normalizedPassword 
    });
    
    if (error) {
      console.error('❌ Erro no login:', error.message);
    } else {
      console.log('✅ Login realizado com sucesso');
    }
    
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    console.log('🚪 Fazendo logout...');
    try {
      // Limpa estado local imediatamente
      setUser(null);
      setSession(null);
      setProfile(null);
      setProfileLoaded(false);
      profileCache.current.clear();
      loadingProfile.current = null;

      // Faz logout no Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Erro no logout:', error.message);
      } else {
        console.log('✅ Logout realizado com sucesso');
      }
      
      return { error };
    } catch (error) {
      console.error('💥 Exceção no logout:', error);
      return { error };
    }
  }, []);

  // Memoiza valores computados
  const contextValue = useMemo(() => {
    // 🔧 [DEBUG] Força detecção de admin por email mesmo sem perfil carregado
    const userEmail = (user?.email ?? '').toLowerCase();
    const isAdminByEmail = userEmail && ADMIN_EMAILS.includes(userEmail);
    const isAdminByProfile = profile?.role === 'admin';
    
    // 🎯 [SUPER FIX] Força admin para email específico
    const isForcedAdmin = userEmail === 'social@ekklesia.com';
    const finalIsAdmin = isForcedAdmin || isAdminByEmail || isAdminByProfile;
    
    // 🔧 [CRITICAL FIX] Garantir que roles sejam calculados corretamente mesmo durante carregamento
    const isTriage = profile?.role === 'triage';
    const isService = profile?.role === 'service';
    
    // 🎯 [STABILITY FIX] Para social@ekklesia.com, forçar roles mesmo sem perfil
    const finalIsTriage = isForcedAdmin ? true : isTriage;
    const finalIsService = isForcedAdmin ? true : isService;
    
    console.log('🔍 [AUTH DEBUG] Calculando roles:', {
      userEmail,
      isAdminByEmail,
      isAdminByProfile,
      isForcedAdmin,
      finalIsAdmin,
      profileRole: profile?.role,
      profileLoaded,
      finalIsTriage,
      finalIsService
    });

    const value = {
      user,
      session,
      loading,
      profile,
      profileLoaded,
      isAdmin: finalIsAdmin,
      isTriage: finalIsTriage,
      isService: finalIsService,
      signIn,
      signOut,
    };
    
    console.log('📊 AuthContext state:', {
      hasUser: !!user,
      hasSession: !!session,
      loading,
      hasProfile: !!profile,
      profileLoaded,
      role: profile?.role,
      isAdmin: finalIsAdmin,
      isTriage: finalIsTriage,
      isService: finalIsService
    });
    
    return value;
  }, [user, session, loading, profile, profileLoaded, signIn, signOut, ADMIN_EMAILS]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext deve ser usado dentro de um AuthProvider');
  }
  return context;
};