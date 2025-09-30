import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('authUser');

      if (storedToken && storedUser) {
        setToken(storedToken);
        // localStorage'dan kullanıcı bilgilerini (rol dahil) geri yükle
        setUser(JSON.parse(storedUser)); 
      }
    } catch (error) {
        console.error('Oturum geri yüklenirken hata:', error);
        localStorage.clear();
        setToken(null);
        setUser(null);
    } finally {
        setLoading(false);
    }
  }, []);

  const login = (userData) => {
    if (userData && userData.token) {
        // localStorage'a kullanıcı bilgilerini (rol dahil) kaydet
        const userToStore = { name: userData.name, email: userData.email, role: userData.role };
        localStorage.setItem('authToken', userData.token);
        localStorage.setItem('authUser', JSON.stringify(userToStore));
        setToken(userData.token);
        setUser(userToStore);
    }
  };

  const logout = () => {
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

