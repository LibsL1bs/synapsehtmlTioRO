import { useEffect, useState } from "react";
import { UserCircle, Mail, Lock, Save } from "lucide-react";
import { apiRequest, getStoredUser, saveStoredUser } from "@/lib/apiClient";

export default function PerfilConta() {
  const [userId, setUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<"user" | "admin">("user");
  const [userAtivo, setUserAtivo] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [initialForm, setInitialForm] = useState({ name: "", email: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setSaveError(null);

      const storedUser = getStoredUser();
      if (!storedUser) {
        setSaveError("Usuário não autenticado.");
        setIsLoading(false);
        return;
      }

      if (!storedUser?.id_user) {
        setSaveError("Não foi possível identificar o usuário logado.");
        setIsLoading(false);
        return;
      }

      setUserId(storedUser.id_user);

      try {
        const data = await apiRequest<{
          user: {
            id_user: number;
            nome: string;
            email: string;
            role: "admin" | "user";
            ativo: boolean;
          };
        }>(
          `/users/${storedUser.id_user}`,
          {
            cache: "no-store",
          },
          {
            requireAdmin: true,
            useFallbackAdmin: true,
          },
        );
        const user = data?.user;
        const loadedName = user?.nome ?? "";
        const loadedEmail = user?.email ?? "";
        const loadedRole = user?.role === "admin" ? "admin" : "user";
        const loadedAtivo = Boolean(user?.ativo);

        setForm((prev) => ({
          ...prev,
          name: loadedName,
          email: loadedEmail,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
        setInitialForm({ name: loadedName, email: loadedEmail });
        setUserRole(loadedRole);
        setUserAtivo(loadedAtivo);
      } catch (error: any) {
        setSaveError(error?.message || "Erro ao carregar perfil.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, []);

  useEffect(() => {
    if (!successNotice) return;
    const timer = window.setTimeout(() => setSuccessNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [successNotice]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaveError(null);

    const nameChanged = form.name.trim() !== initialForm.name;
    const emailChanged = form.email.trim() !== initialForm.email;
    const hasCurrent = form.currentPassword.trim().length > 0;
    const hasNew = form.newPassword.trim().length > 0;
    const hasConfirm = form.confirmPassword.trim().length > 0;
    const passwordAttempt = hasCurrent || hasNew || hasConfirm;
    let passwordChanged = false;
    let passwordToSend = "";

    if (!nameChanged && !emailChanged && !passwordAttempt) {
      return;
    }

    if (passwordAttempt) {
      let passwordRulesOk = true;

      if (!hasCurrent) {
        passwordRulesOk = false;
      }

      if (!hasNew || form.newPassword !== form.confirmPassword) {
        passwordRulesOk = false;
      }

      if (passwordRulesOk) {
        try {
          await apiRequest(
            "/auth/login",
            {
              method: "POST",
              body: JSON.stringify({
                email: form.email.trim(),
                password: form.currentPassword,
              }),
            },
            {
              requireAdmin: true,
              useFallbackAdmin: true,
            },
          );
        } catch {
          passwordRulesOk = false;
        }
      }

      if (!passwordRulesOk) {
        setForm((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
        setSuccessNotice("Não foi possível alterar a senha: confira senha atual e confirmação.");

        if (!nameChanged && !emailChanged) {
          return;
        }
      } else {
        passwordChanged = true;
        passwordToSend = form.newPassword;
      }
    }

    setIsSaving(true);
    try {
      await apiRequest(
        `/users/${userId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            nome: form.name.trim(),
            email: form.email.trim(),
            senha: passwordChanged ? passwordToSend : "",
            ativo: userAtivo,
            role: userRole,
          }),
        },
        {
          requireAdmin: true,
          useFallbackAdmin: true,
        },
      );

      const updatedName = form.name.trim();
      const updatedEmail = form.email.trim();

      setInitialForm({ name: updatedName, email: updatedEmail });
      setForm((prev) => ({
        ...prev,
        name: updatedName,
        email: updatedEmail,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      const currentUser = getStoredUser();
      if (currentUser) {
        saveStoredUser(
          {
            ...currentUser,
            nome: updatedName,
            email: updatedEmail,
          },
          Boolean(localStorage.getItem("user")),
        );
      }

      setSuccessNotice("Perfil atualizado com sucesso.");
    } catch (error: any) {
      setSaveError(error?.message || "Erro ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative p-5 space-y-6 max-w-2xl mx-auto animate-fade-in">
      {successNotice && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] border border-alert px-4 py-2.5 rounded-sm"
          style={{ backgroundColor: "hsl(var(--surface-1))" }}
        >
          <span className="text-xs font-mono text-foreground tracking-[0.08em]">{successNotice}</span>
        </div>
      )}

      <div className="pb-3 border-b border-border">
        <h1 className="text-lg font-bold text-foreground uppercase tracking-wide">Perfil</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tracking-wider">GERENCIAMENTO DE CONTA DO ATLETA</p>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground font-mono">Carregando perfil...</div>
      ) : null}
      {saveError ? (
        <div className="text-xs text-red-500 font-mono">{saveError}</div>
      ) : null}

      {/* Avatar / Identity */}
      <div className="surface-2 border border-border p-5 panel-shadow">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 border border-border flex items-center justify-center surface-3">
            <UserCircle className="w-8 h-8 text-muted-foreground" strokeWidth={1} />
          </div>
          <div>
            <span className="text-sm font-bold font-mono text-foreground">{form.name}</span>
            <span className="block text-[10px] text-muted-foreground font-mono tracking-wider mt-0.5">{form.email}</span>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="surface-2 border border-border p-5 panel-shadow space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase">Informações Pessoais</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "NOME DO ATLETA", field: "name", type: "text" },
            { label: "EMAIL", field: "email", type: "email" },
          ].map((item) => (
            <div key={item.field}>
              <label className="block text-[9px] font-mono text-muted-foreground tracking-[0.2em] mb-1.5">
                {item.label}
              </label>
              <input
                type={item.type}
                value={form[item.field as keyof typeof form]}
                onChange={handleChange(item.field)}
                className="w-full h-9 border border-border px-3 text-xs text-foreground font-mono focus:outline-none focus:border-alert/50 transition-colors"
                style={{ backgroundColor: "hsl(var(--surface-1))" }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Password */}
      <div className="surface-2 border border-border p-5 panel-shadow space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase">Alterar Senha</span>
        </div>

        <div className="space-y-3">
          {[
            { label: "SENHA ATUAL", field: "currentPassword" },
            { label: "NOVA SENHA", field: "newPassword" },
            { label: "CONFIRMAR NOVA SENHA", field: "confirmPassword" },
          ].map((item) => (
            <div key={item.field}>
              <label className="block text-[9px] font-mono text-muted-foreground tracking-[0.2em] mb-1.5">
                {item.label}
              </label>
              <input
                type="password"
                value={form[item.field as keyof typeof form]}
                onChange={handleChange(item.field)}
                placeholder="••••••••"
                className="w-full h-9 border border-border px-3 text-xs text-foreground font-mono placeholder:text-muted-foreground/30 focus:outline-none focus:border-alert/50 transition-colors"
                style={{ backgroundColor: "hsl(var(--surface-1))" }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isLoading || isSaving}
        className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] bg-foreground text-background px-5 py-2.5 hover:bg-foreground/90 transition-colors disabled:opacity-50"
      >
        <Save className="w-3.5 h-3.5" />
        {isSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
      </button>
    </div>
  );
}
