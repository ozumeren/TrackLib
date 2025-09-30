import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] useEffect çalıştı. localStorage kontrol ediliyor...');
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('authUser');
      if (storedToken && storedUser) {
        console.log('[AuthContext] Kayıtlı oturum bulundu. Durum geri yükleniyor.');
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        console.log('[AuthContext] Kayıtlı oturum bulunamadı.');
      }
    } catch (error) {
        console.error('[AuthContext] localStorage okunurken bir hata oluştu:', error);
        localStorage.clear();
        setToken(null);
        setUser(null);
    } finally {
        setLoading(false);
    }
  }, []);

  const login = (userData) => {
    console.log('[AuthContext] Login fonksiyonu çağrıldı. Gelen Veri:', userData);
    if (userData && userData.token) {
        localStorage.setItem('authToken', userData.token);
        localStorage.setItem('authUser', JSON.stringify({ name: userData.name, email: userData.email }));
        setToken(userData.token);
        setUser({ name: userData.name, email: userData.email });
        console.log('[AuthContext] State güncellendi. Yeni Token:', userData.token);
    } else {
        console.error('[AuthContext] Login fonksiyonu çağrıldı ancak gelen veri geçersiz veya token eksik.');
    }
  };

  const logout = () => {
    console.log('[AuthContext] Logout fonksiyonu çağrıldı.');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
  };

  const value = { token, user, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

