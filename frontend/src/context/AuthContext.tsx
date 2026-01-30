import { createContext, useState, ReactNode, useEffect  } from "react";

/* شكل بيانات المستخدم */
type User = {
  name: string;
};

/* شكل الـ Context */
type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
};

/* إنشاء الـ Context */
export const AuthContext = createContext<AuthContextType | null>(null);

/* Provider */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // 🔹 Demo user (مؤقت للتجربة)
  useEffect(() => {
    setUser({ name: "Ishrat Zahan" });
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
