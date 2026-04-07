import { Search, ChevronRight } from "lucide-react";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/apiClient";

interface UserItem {
  id_user: number;
  nome: string;
  email: string;
  role: "user" | "admin";
  ativo: boolean;
}

export default function AdminUsuarios() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchName, setSearchName] = useState("");
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({
    nome: "",
    email: "",
    senha: "",
    ativo: true,
    role: "user" as "user" | "admin",
  });
  const [editForm, setEditForm] = useState({
    nome: "",
    email: "",
    senha: "",
    ativo: true,
    role: "user" as "user" | "admin",
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ users: UserItem[] }>("/users", undefined, {
        requireAdmin: true,
        useFallbackAdmin: true,
      });
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  useEffect(() => {
    if (!successNotice) return;
    const timer = window.setTimeout(() => setSuccessNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [successNotice]);

  const filteredUsers = users.filter((user) =>
    user.nome.toLowerCase().includes(searchName.trim().toLowerCase()),
  );

  const openEditModal = (user: UserItem) => {
    setEditingUserId(user.id_user);
    setEditForm({
      nome: user.nome,
      email: user.email,
      senha: "",
      ativo: Boolean(user.ativo),
      role: user.role === "admin" ? "admin" : "user",
    });
    setSaveError(null);
    setIsEditOpen(true);
  };

  const openCreateModal = () => {
    setCreateForm({
      nome: "",
      email: "",
      senha: "",
      ativo: true,
      role: "user",
    });
    setSaveError(null);
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    setSaveError(null);

    if (!createForm.nome.trim() || !createForm.email.trim() || !createForm.senha.trim()) {
      setSaveError("Preencha nome, email e senha.");
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest<{ user: UserItem }>(
        "/users",
        {
          method: "POST",
          body: JSON.stringify(createForm),
        },
        {
          requireAdmin: true,
          useFallbackAdmin: true,
        },
      );
      await fetchUsers();
      setIsCreateOpen(false);
      setSuccessNotice("Usuário criado com sucesso.");
    } catch (err: any) {
      setSaveError(err.message || "Erro desconhecido");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editingUserId) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      await apiRequest<{ user: UserItem }>(
        `/users/${editingUserId}`,
        {
          method: "PUT",
          body: JSON.stringify(editForm),
        },
        {
          requireAdmin: true,
          useFallbackAdmin: true,
        },
      );
      await fetchUsers();
      setIsEditOpen(false);
      setEditingUserId(null);
      setSuccessNotice("Usuário atualizado com sucesso.");
    } catch (err: any) {
      setSaveError(err.message || "Erro desconhecido");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingUserId) return;
    const confirmed = window.confirm("Tem certeza que deseja excluir este usuário?");
    if (!confirmed) return;

    setSaveError(null);
    setIsDeleting(true);
    try {
      await apiRequest<{ deleted: boolean; id_user: number }>(
        `/users/${editingUserId}`,
        {
          method: "DELETE",
        },
        {
          requireAdmin: true,
          useFallbackAdmin: true,
        },
      );
      await fetchUsers();
      setIsEditOpen(false);
      setEditingUserId(null);
      setSuccessNotice("Usuário excluído com sucesso.");
    } catch (err: any) {
      setSaveError(err.message || "Erro desconhecido");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative p-5 space-y-4 max-w-5xl mx-auto animate-fade-in">
      <div className="pb-3 border-b border-border">
        <h1 className="text-lg font-bold text-foreground uppercase tracking-wide">Usuários</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tracking-wider">CRUD E GERENCIAMENTO DE ROLES</p>
      </div>

      {successNotice && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] border border-alert px-4 py-2.5 rounded-sm"
          style={{ backgroundColor: "hsl(var(--surface-1))" }}
        >
          <span className="text-xs font-mono text-foreground tracking-[0.08em]">{successNotice}</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Buscar usuários..."
            className="w-full h-9 pl-9 pr-3 border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-alert/50 transition-colors"
            style={{ backgroundColor: "hsl(var(--surface-1))" }}
          />
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="text-[10px] font-mono tracking-[0.2em] border border-border px-3 py-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          + ADICIONAR
        </button>
      </div>

      <div className="border border-border divide-y divide-border">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 surface-1">
          <span className="col-span-3 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">NOME</span>
          <span className="col-span-4 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">EMAIL</span>
          <span className="col-span-2 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">ROLE</span>
          <span className="col-span-2 text-[9px] font-mono text-muted-foreground tracking-[0.2em]">STATUS</span>
          <span className="col-span-1" />
        </div>
        {loading ? (
          <div className="px-4 py-3 text-xs text-muted-foreground font-mono">Carregando usuários...</div>
        ) : error ? (
          <div className="px-4 py-3 text-xs text-red-500 font-mono">{error}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-4 py-3 text-xs text-muted-foreground font-mono">Nenhum usuário encontrado.</div>
        ) : (
          filteredUsers.map((u) => (
            <button
              key={u.id_user}
              type="button"
              onClick={() => openEditModal(u)}
              className="w-full text-left grid grid-cols-12 gap-2 px-4 py-3 items-center hover:surface-1 transition-colors group"
            >
              <span className="col-span-3 text-xs font-mono text-foreground">{u.nome}</span>
              <span className="col-span-4 text-xs font-mono text-muted-foreground">{u.email}</span>
              <span className="col-span-2">
                <span className={`text-[9px] font-mono tracking-[0.15em] px-2 py-0.5 border ${u.role === "admin" ? "border-alert/40 text-alert" : "border-border text-muted-foreground"}`}>
                  {u.role.toUpperCase()}
                </span>
              </span>
              <span className="col-span-2 flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${u.ativo ? "bg-success" : "bg-muted-foreground"}`} />
                <span className="text-[10px] font-mono text-muted-foreground">{u.ativo ? "ativo" : "inativo"}</span>
              </span>
              <span className="col-span-1 flex justify-end">
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-foreground transition-colors" />
              </span>
            </button>
          ))
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-border bg-background sm:rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground uppercase tracking-wide">Editar Usuário</DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground font-mono tracking-wider">
              Atualize nome, email, senha, status e role do usuário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1.5">NOME</label>
              <input
                value={editForm.nome}
                onChange={(e) => setEditForm((prev) => ({ ...prev, nome: e.target.value }))}
                className="w-full h-10 border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-alert/50 transition-colors font-mono"
                style={{ backgroundColor: "hsl(var(--surface-1))" }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1.5">EMAIL</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full h-10 border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-alert/50 transition-colors font-mono"
                style={{ backgroundColor: "hsl(var(--surface-1))" }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1.5">SENHA</label>
              <input
                type="password"
                placeholder="Deixe em branco para manter"
                value={editForm.senha}
                onChange={(e) => setEditForm((prev) => ({ ...prev, senha: e.target.value }))}
                className="w-full h-10 border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-alert/50 transition-colors font-mono"
                style={{ backgroundColor: "hsl(var(--surface-1))" }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1.5">ROLE</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value as "user" | "admin" }))}
                className="w-full h-10 border border-border px-3 text-sm text-foreground focus:outline-none focus:border-alert/50 transition-colors font-mono"
                style={{ backgroundColor: "hsl(var(--surface-1))" }}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={editForm.ativo}
                onChange={(e) => setEditForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                className="h-3.5 w-3.5 border border-border accent-alert"
              />
              <span className="text-[10px] font-mono text-muted-foreground tracking-wider group-hover:text-foreground transition-colors">
                ATIVO
              </span>
            </label>

            {saveError && <div className="text-xs text-red-500 font-mono">{saveError}</div>}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="h-9 px-4 text-[10px] font-mono tracking-[0.2em] bg-alert text-alert-foreground hover:bg-alert/90 transition-colors disabled:opacity-50"
            >
              {isDeleting ? "EXCLUINDO..." : "EXCLUIR"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="h-9 px-4 text-[10px] font-mono tracking-[0.2em] border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="h-9 px-4 text-[10px] font-mono tracking-[0.2em] bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? "SALVANDO..." : "SALVAR"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-border bg-background sm:rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground uppercase tracking-wide">Adicionar Usuário</DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground font-mono tracking-wider">
              Preencha os dados para criar um novo usuário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1.5">NOME</label>
              <input
                value={createForm.nome}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, nome: e.target.value }))}
                className="w-full h-10 border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-alert/50 transition-colors font-mono"
                style={{ backgroundColor: "hsl(var(--surface-1))" }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1.5">EMAIL</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full h-10 border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-alert/50 transition-colors font-mono"
                style={{ backgroundColor: "hsl(var(--surface-1))" }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1.5">SENHA</label>
              <input
                type="password"
                value={createForm.senha}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, senha: e.target.value }))}
                className="w-full h-10 border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-alert/50 transition-colors font-mono"
                style={{ backgroundColor: "hsl(var(--surface-1))" }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-muted-foreground tracking-[0.2em] mb-1.5">ROLE</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value as "user" | "admin" }))}
                className="w-full h-10 border border-border px-3 text-sm text-foreground focus:outline-none focus:border-alert/50 transition-colors font-mono"
                style={{ backgroundColor: "hsl(var(--surface-1))" }}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={createForm.ativo}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                className="h-3.5 w-3.5 border border-border accent-alert"
              />
              <span className="text-[10px] font-mono text-muted-foreground tracking-wider group-hover:text-foreground transition-colors">
                ATIVO
              </span>
            </label>

            {saveError && <div className="text-xs text-red-500 font-mono">{saveError}</div>}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="h-9 px-4 text-[10px] font-mono tracking-[0.2em] border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSaving}
              className="h-9 px-4 text-[10px] font-mono tracking-[0.2em] bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? "CRIANDO..." : "CRIAR"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
