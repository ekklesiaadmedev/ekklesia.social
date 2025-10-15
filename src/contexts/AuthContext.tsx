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
  const um = (u.user_metadata ?? {}) as Record<string, unknown>;
  const am = ((u as unknown as { app_metadata?: Record<string, unknown> }).app_metadata ?? {}) as Record<string, unknown>;

  const fromUmRole = typeof um['role'] === 'string' ? (um['role'] as string) : null;
  const fromUmRoles = Array.isArray(um['roles']) ? (um['roles'] as unknown[]).find((r) => typeof r === 'string') as string | undefined : undefined;
  const fromAmRole = typeof am['role'] === 'string' ? (am['role'] as string) : null;
  const fromAmRoles = Array.isArray(am['roles']) ? (am['roles'] as unknown[]).find((r) => typeof r === 'string') as string | undefined : undefined;

  const role = fromUmRole ?? fromUmRoles ?? fromAmRole ?? fromAmRoles ?? null;
  if (role === 'admin' || role === 'triage' || role === 'service' || role === 'panel') return role;
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('🔐 [AUTH_CONTEXT] AuthProvider carregado!');
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  // Cache otimizado com TTL
  const profileCache = useRef<Map<string, { profile: Profile; timestamp: number }>>(new Map());
  const loadingProfile = useRef<string | null>(null);
  const initialized = useRef(false);
  const authTimeout = useRef<NodeJS.Timeout | null>(null);
  const forceLoadTimeout = useRef<NodeJS.Timeout | null>(null);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  const AUTH_TIMEOUT = 3000; // 3 segundos timeout AGRESSIVO
  const FORCE_LOAD_TIMEOUT = 2000; // 2 segundos para forçar carregamento

  console.log('🚀 AuthProvider inicializando...');

  // 🔧 [FIX] Lista hardcoded de emails admin para garantir funcionamento
  const ADMIN_EMAILS: string[] = useMemo(() => {
    const envEmails = ((import.meta.env.VITE_ADMIN_EMAIL ?? '') as string)
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    
    // Lista hardcoded de emails admin para garantir funcionamento
    const hardcodedAdmins = [
      'admin@ekklesia.com',
      'social@ekklesia.com', // 🎯 Email específico do usuário
      'ekklesia@social.com'
    ];
    
    // Combina emails do .env com hardcoded (remove duplicatas)
    const allEmails = [...new Set([...envEmails, ...hardcodedAdmins])];
    
    console.log('📧 [ADMIN_EMAILS] Lista final:', allEmails);
    return allEmails;
  }, []);

  // Função para forçar carregamento IMEDIATO
  const forceLoadComplete = useCallback(() => {
    console.warn('🚨 TIMEOUT ATINGIDO - FORÇANDO CARREGAMENTO IMEDIATO');
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

    try {
      console.log('📡 Consultando perfil no banco...');
      
      // Timeout MUITO agressivo para consulta
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile query timeout')), 2000); // 2 segundos apenas
      });

      const raceResult = await Promise.race([profilePromise, timeoutPromise]) as unknown;
      const { data, error } = (raceResult && typeof raceResult === 'object' && 'data' in raceResult)
        ? (raceResult as { data: unknown; error: unknown })
        : { data: null, error: new Error('Profile query timeout') };

      if (data && !error) {
        console.log('✅ Perfil carregado do banco:', data);
        let profileData = data as Profile;
        
        // Verifica admin
        const email = (u.email ?? '').toLowerCase();
        if (email && ADMIN_EMAILS.includes(email) && profileData.role !== 'admin') {
          profileData = { ...profileData, role: 'admin' };
          console.log('👑 Promovendo usuário para admin');
        }

        profileCache.current.set(u.id, { 
          profile: profileData, 
          timestamp: Date.now() 
        });
        setProfile(profileData);
        setProfileLoaded(true);
        loadingProfile.current = null;
        return;
      }
    } catch (e) {
      console.warn('⚠️ Erro ao carregar perfil, usando fallback rápido:', e);
    }

    // Fallback IMEDIATO
    console.log('🔄 Usando fallback para perfil...');
    const email = (u.email ?? '').toLowerCase();
    const metaRole = resolveRoleFromMetadata(u);
    let fallbackRole: Profile['role'] = 'user';
    
    if (email && ADMIN_EMAILS.includes(email)) {
      fallbackRole = 'admin';
    } else if (metaRole) {
      fallbackRole = metaRole;
    }

    const fullNameRaw = ((u.user_metadata ?? {}) as Record<string, unknown>)['full_name'];
    const fullName = typeof fullNameRaw === 'string' ? fullNameRaw : (fallbackRole === 'admin' ? 'Administrador' : null);
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
    
    console.log('🔍 [AUTH DEBUG] Calculando isAdmin:', {
      userEmail,
      isAdminByEmail,
      isAdminByProfile,
      isForcedAdmin,
      finalIsAdmin,
      ADMIN_EMAILS,
      profileRole: profile?.role
    });

    const value = {
      user,
      session,
      loading,
      profile,
      profileLoaded,
      isAdmin: finalIsAdmin, // 🔧 [FIX] Usa lógica robusta
      isTriage: profile?.role === 'triage',
      isService: profile?.role === 'service',
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
      isTriage: profile?.role === 'triage',
      isService: profile?.role === 'service'
    });
    
    return value;
  }, [user, session, loading, profile, profileLoaded, signIn, signOut, ADMIN_EMAILS]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};