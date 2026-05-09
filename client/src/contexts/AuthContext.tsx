import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface SurveyFlowStatus {
  applicable: boolean;
  isFirstLogin: boolean;
  shouldPromptSurvey: boolean;
  completed: boolean;
  requiresSurvey: boolean;
  status: string;
  hasInitialSurvey?: boolean;
  hasEmployabilityAssessment?: boolean;
  hasEmployabilityPrediction?: boolean;
  hasJobMatchingPrediction?: boolean;
  employmentStatus?: string | null;
  resolvedPath?: string | null;
  nextPath?: string | null;
  nextStep?: string | null;
  surveyVersion?: number;
  collegeId?: number | null;
  collegeName?: string | null;
  programId?: number | null;
  programName?: string | null;
  programCode?: string | null;
  routeHints?: {
    surveyStatus?: string;
    initialSurvey?: string | null;
    employabilitySubmit?: string;
    latestPrediction?: string;
    jobMatchingGenerate?: string;
    latestJobMatching?: string;
  };
  readiness?: {
    initialSurvey?: boolean;
    unemployedAssessment?: boolean;
    employedAssessment?: boolean;
    arimaForecast?: boolean;
    jobMatching?: boolean;
    jobMatchingEligible?: boolean;
    extendedCompetenciesCatalog?: boolean | null;
  };
  jobMatchingRuntime?: {
    ready?: boolean;
    missingPaths?: string[];
  };
}

// Define the User type (matching your database schema)
interface User {
  id: number;
  username: string;
  email: string;
  role: 'superadmin' | 'admin' | 'alumni';
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  firstLogin?: boolean;
  surveyCompleted?: boolean;
  lastLogin?: string;
  survey?: SurveyFlowStatus | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  completeFirstLogin: () => void;
  completeSurvey: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API URL - make sure this matches your backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Check both localStorage and sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (token && savedUser) {
      return JSON.parse(savedUser);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (userId: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: userId, 
          password: password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.error || 'Login failed. Please try again.' 
        };
      }

      if (data.success) {
        const surveyData: SurveyFlowStatus | null = data.survey || null;

        // Convert backend user format to frontend User type
        const userData: User = {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: data.user.role,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          middleName: data.user.middleName,
          suffix: data.user.suffix,
          lastLogin: data.user.lastLogin,
          firstLogin: surveyData?.isFirstLogin ?? !data.user.lastLogin,
          surveyCompleted: surveyData?.completed ?? false,
          survey: surveyData
        };

        setUser(userData);
        
        // Store in localStorage (if remember me) or sessionStorage
        const storage = localStorage.getItem('remember') ? localStorage : sessionStorage;
        storage.setItem('token', data.token);
        storage.setItem('user', JSON.stringify(userData));
        
        return { success: true };
      }
      
      return { success: false, error: 'Login failed' };
      
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Unable to connect to server. Please check your connection.' 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }, []);

  const completeFirstLogin = useCallback(() => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        firstLogin: false,
        survey: prev.survey
          ? {
              ...prev.survey,
              isFirstLogin: false
            }
          : prev.survey
      };
      const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const completeSurvey = useCallback(() => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        surveyCompleted: true,
        survey: prev.survey
          ? {
              ...prev.survey,
              completed: true,
              requiresSurvey: false,
              shouldPromptSurvey: false,
              hasEmployabilityPrediction: true,
              nextPath: null,
              nextStep: 'view_results'
            }
          : prev.survey
      };
      const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      logout, 
      completeFirstLogin, 
      completeSurvey, 
      updateUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
