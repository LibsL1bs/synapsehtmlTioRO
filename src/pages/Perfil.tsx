import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import { apiRequest, getStoredUser, resolveApiBaseUrl, SessionUser } from "@/lib/apiClient";

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: {
    id_memoria?: number;
    id_user?: number;
    nome: string;
    tipo: string;
    subtipo?: string;
    data: string;
    conteudo: string;
    conteudo_raw?: unknown;
    origem?: "nota" | "estado";
  };
}

type MemoryRecord = {
  id_memoria?: number;
  id_user?: number;
  nome?: string;
  tipo?: string;
  subtipo?: string;
  conteudo?: unknown;
};

type EditablePrimitive = string | number | boolean | null;

type EditableLine = {
  path: string;
  label: string;
  depth: number;
  value: EditablePrimitive;
};

const isStructuredJson = (value: unknown): value is Record<string, unknown> | unknown[] =>
  Boolean(value) && (Array.isArray(value) || typeof value === "object");

const isPrimitiveValue = (value: unknown): value is EditablePrimitive =>
  value === null || ["string", "number", "boolean"].includes(typeof value);

const pathSegment = (prefix: string, segment: string): string =>
  prefix ? `${prefix}.${segment}` : segment;

const arrayPathSegment = (prefix: string, index: number): string =>
  `${prefix}[${index}]`;

const collectEditableLines = (value: unknown, prefix = "", depth = 0): EditableLine[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      const itemPath = arrayPathSegment(prefix, index);
      if (isPrimitiveValue(item)) {
        return [
          {
            path: itemPath,
            label: itemPath,
            depth,
            value: item,
          },
        ];
      }

      return collectEditableLines(item, itemPath, depth + 1);
    });
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      const itemPath = pathSegment(prefix, key);
      if (isPrimitiveValue(item)) {
        return [
          {
            path: itemPath,
            label: key,
            depth,
            value: item,
          },
        ];
      }

      return collectEditableLines(item, itemPath, depth + 1);
    });
  }

  return [];
};

const primitiveToText = (value: EditablePrimitive): string => {
  if (value === null) return "--";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};

const normalizeText = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const ESTADO_FIXED_ORDER = [
  "bp",
  "squat",
  "dl",
  "sono-seg",
  "sono-ter",
  "sono-qua",
  "sono-qui",
  "sono-sex",
  "sono-sab",
  "sono-dom",
  "proteinas",
  "carboidratos",
  "calorias",
  "readiness",
  "fadiga neural aproximada",
] as const;

const ESTADO_FIXED_ORDER_MAP = new Map<string, number>(
  ESTADO_FIXED_ORDER.map((key, index) => [normalizeText(key), index]),
);

const buildMemoryTree = (memorias: MemoryRecord[]): FileNode[] => {
  const tree: FileNode[] = [
    {
      name: "perfil",
      type: "folder",
      children: [
        { name: "anatomico", type: "folder", children: [] },
        { name: "fisiologico", type: "folder", children: [] },
        { name: "psicologico", type: "folder", children: [] },
      ],
    },
    { name: "estado", type: "folder", children: [] },
    {
      name: "dados",
      type: "folder",
      children: [
        { name: "treinos", type: "folder", children: [] },
        { name: "notas", type: "folder", children: [] },
      ],
    },
    {
      name: "interpretado",
      type: "folder",
      children: [
        { name: "hipoteses", type: "folder", children: [] },
        { name: "notas", type: "folder", children: [] },
      ],
    },
  ];

  for (let i = 0; i < memorias.length; i += 1) {
    const memoria = memorias[i] || {};
    const nome = String(memoria.nome || `memoria_${i + 1}`).trim() || `memoria_${i + 1}`;
    const tipo = String(memoria.tipo || "").trim().toLowerCase();
    const subtipo = String(memoria.subtipo || "").trim().toLowerCase();

    const fileNode: FileNode = {
      name: nome,
      type: "file",
      content: {
        id_memoria: Number(memoria.id_memoria ?? 0),
        id_user: Number(memoria.id_user ?? 0),
        nome,
        tipo,
        subtipo,
        data: "",
        conteudo: JSON.stringify(memoria.conteudo ?? null, null, 2),
        conteudo_raw: memoria.conteudo ?? null,
        origem: tipo === "estado" ? "estado" : "nota",
      },
    };

    let destino: FileNode[] = tree[2].children?.[1]?.children || [];

    if (tipo === "perfil") {
      const perfil = tree[0];
      const alvo = subtipo === "anatomico" ? "anatomico" : subtipo === "fisiologico" ? "fisiologico" : "psicologico";
      destino = perfil.children?.find((child) => child.name === alvo)?.children || perfil.children?.[2]?.children || [];
    } else if (tipo === "estado") {
      destino = tree[1].children || [];
    } else if (tipo === "bruta" && subtipo === "treino") {
      destino = tree[2].children?.find((child) => child.name === "treinos")?.children || tree[2].children?.[0]?.children || [];
    } else if (tipo === "interpretada" && subtipo === "hipotese") {
      destino = tree[3].children?.find((child) => child.name === "hipoteses")?.children || tree[3].children?.[0]?.children || [];
    } else if (tipo === "interpretada") {
      destino = tree[3].children?.find((child) => child.name === "notas")?.children || tree[3].children?.[1]?.children || [];
    }

    destino.push(fileNode);
  }

  for (const folder of tree) {
    for (const child of folder.children || []) {
      if (child.type === "folder") {
        child.children?.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      }
    }
    if (folder.name === "estado") {
      folder.children?.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }
  }

  return tree;
};

const getLastPathSegment = (path: string): string => {
  const match = path.match(/([^.\[\]]+)(?:\[\d+\])?$/);
  return match?.[1] || path;
};

const sortEditableLinesForEstado = (lines: EditableLine[]): EditableLine[] =>
  [...lines].sort((first, second) => {
    const firstKey = normalizeText(getLastPathSegment(first.path));
    const secondKey = normalizeText(getLastPathSegment(second.path));
    const firstOrder = ESTADO_FIXED_ORDER_MAP.get(firstKey);
    const secondOrder = ESTADO_FIXED_ORDER_MAP.get(secondKey);

    if (firstOrder === undefined && secondOrder === undefined) return 0;
    if (firstOrder === undefined) return 1;
    if (secondOrder === undefined) return -1;
    return firstOrder - secondOrder;
  });

const isSleepFieldPath = (path: string): boolean => normalizeText(path).includes("sono");

const parsePrimitiveText = (
  path: string,
  text: string,
  baseValue: EditablePrimitive,
): { ok: true; value: EditablePrimitive } | { ok: false; error: string } => {
  const trimmed = text.trim();

  if (typeof baseValue === "string") {
    return { ok: true, value: text };
  }

  if (typeof baseValue === "number") {
    if ((trimmed.length === 0 || trimmed === "--" || trimmed.toLowerCase() === "null") && isSleepFieldPath(path)) {
      return { ok: true, value: null };
    }

    const numericText = trimmed.replace(",", ".");
    const parsed = Number(numericText);
    if (!Number.isFinite(parsed)) {
      return { ok: false, error: "Valor numérico inválido." };
    }
    return { ok: true, value: parsed };
  }

  if (typeof baseValue === "boolean") {
    if (trimmed === "true") return { ok: true, value: true };
    if (trimmed === "false") return { ok: true, value: false };
    return { ok: false, error: "Valor booleano inválido. Use true ou false." };
  }

  if (baseValue === null) {
    if (trimmed.length === 0 || trimmed === "--" || trimmed.toLowerCase() === "null") {
      return { ok: true, value: null };
    }

    const lowered = trimmed.toLowerCase();
    if (lowered === "true") return { ok: true, value: true };
    if (lowered === "false") return { ok: true, value: false };

    const numericText = trimmed.replace(",", ".");
    const parsedNumber = Number(numericText);
    if (Number.isFinite(parsedNumber)) {
      return { ok: true, value: parsedNumber };
    }

    return { ok: true, value: text };
  }

  if (trimmed.length === 0 || trimmed === "--") {
    return { ok: true, value: null };
  }

  if (trimmed !== "null") {
    return { ok: false, error: "Valor nulo inválido. Use null." };
  }

  return { ok: true, value: null };
};

const applyEditedValues = (
  base: unknown,
  valueMap: Record<string, string>,
  currentPath = "",
): { ok: true; value: unknown } | { ok: false; error: string } => {
  if (Array.isArray(base)) {
    const rebuilt: unknown[] = [];
    for (let index = 0; index < base.length; index += 1) {
      const path = arrayPathSegment(currentPath, index);
      const item = base[index];
      if (isPrimitiveValue(item)) {
        const parseResult = parsePrimitiveText(path, valueMap[path] ?? primitiveToText(item), item);
        if (parseResult.ok === false) {
          return { ok: false, error: `${path}: ${parseResult.error}` };
        }
        rebuilt.push(parseResult.value);
      } else {
        const nested = applyEditedValues(item, valueMap, path);
        if (!nested.ok) return nested;
        rebuilt.push(nested.value);
      }
    }

    return { ok: true, value: rebuilt };
  }

  if (base && typeof base === "object") {
    const rebuilt: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(base as Record<string, unknown>)) {
      const path = pathSegment(currentPath, key);
      if (isPrimitiveValue(item)) {
        const parseResult = parsePrimitiveText(path, valueMap[path] ?? primitiveToText(item), item);
        if (parseResult.ok === false) {
          return { ok: false, error: `${path}: ${parseResult.error}` };
        }
        rebuilt[key] = parseResult.value;
      } else {
        const nested = applyEditedValues(item, valueMap, path);
        if (!nested.ok) return nested;
        rebuilt[key] = nested.value;
      }
    }

    return { ok: true, value: rebuilt };
  }

  return { ok: true, value: base };
};

const hasCompatibleStructure = (base: unknown, candidate: unknown): boolean => {
  if (Array.isArray(base)) {
    if (!Array.isArray(candidate) || base.length !== candidate.length) return false;
    return base.every((item, index) => hasCompatibleStructure(item, candidate[index]));
  }

  if (base && typeof base === "object") {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
    const baseObject = base as Record<string, unknown>;
    const candidateObject = candidate as Record<string, unknown>;
    const baseKeys = Object.keys(baseObject).sort();
    const candidateKeys = Object.keys(candidateObject).sort();

    if (baseKeys.length !== candidateKeys.length) return false;
    if (!baseKeys.every((key, index) => key === candidateKeys[index])) return false;

    return baseKeys.every((key) => hasCompatibleStructure(baseObject[key], candidateObject[key]));
  }

  return !Array.isArray(candidate) && (candidate === null || typeof candidate !== "object");
};

const updateMemoryNodeContent = (
  nodes: FileNode[],
  memoryId: number,
  conteudo: unknown,
): FileNode[] =>
  nodes.map((node) => {
    if (node.type === "folder" && node.children) {
      return {
        ...node,
        children: updateMemoryNodeContent(node.children, memoryId, conteudo),
      };
    }

    if (node.type === "file" && node.content?.id_memoria === memoryId) {
      return {
        ...node,
        content: {
          ...node.content,
          conteudo_raw: conteudo,
          conteudo: JSON.stringify(conteudo, null, 2),
        },
      };
    }

    return node;
  });

const findFirstFile = (nodes: FileNode[]): FileNode | null => {
  for (const node of nodes) {
    if (node.type === "file") {
      return node;
    }

    if (node.children?.length) {
      const childFile = findFirstFile(node.children);
      if (childFile) {
        return childFile;
      }
    }
  }

  return null;
};

const findNodePath = (nodes: FileNode[], target: FileNode, currentPath = ""): string | null => {
  for (const item of nodes) {
    const nextPath = currentPath ? `${currentPath}/${item.name}` : item.name;
    if (item === target) return nextPath;
    if (item.type === "folder" && item.children) {
      const found = findNodePath(item.children, target, nextPath);
      if (found) return found;
    }
  }

  return null;
};

function FileTreeItem({
  node,
  depth = 0,
  onSelect,
  selectedFile,
  nodePath,
}: {
  node: FileNode;
  depth?: number;
  onSelect: (node: FileNode, nodePath: string) => void;
  selectedFile: string | null;
  nodePath: string;
}) {
  const [open, setOpen] = useState(depth === 0);

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:surface-2 rounded-sm transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
          {open ? <FolderOpen className="w-3 h-3 shrink-0 text-warning" /> : <Folder className="w-3 h-3 shrink-0 text-warning" />}
          <span className="font-medium font-mono uppercase tracking-wider">{node.name}</span>
        </button>
        {open && node.children?.map((child) => (
          <FileTreeItem
            key={`${nodePath}/${child.name}`}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            selectedFile={selectedFile}
            nodePath={`${nodePath}/${child.name}`}
          />
        ))}
      </div>
    );
  }

  const isSelected = selectedFile === node.name;

  return (
    <button
      onClick={() => onSelect(node, nodePath)}
      className={`relative w-full flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm transition-colors ${
        isSelected
          ? "surface-3 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:surface-2"
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {isSelected && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-alert rounded-r-sm" />}
      <FileText className="w-3 h-3 shrink-0" />
      <span className="font-mono">{node.name}</span>
    </button>
  );
}
export default function Perfil() {
  const apiBaseUrl = resolveApiBaseUrl();
  const [memoryTree, setMemoryTree] = useState<FileNode[]>([]);
  const [selectedMemoryFile, setSelectedMemoryFile] = useState<FileNode | null>(null);
  const [isMemoryLoading, setIsMemoryLoading] = useState(true);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [editableLines, setEditableLines] = useState<EditableLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const valueRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    if (!user?.id_user) return;

    const controller = new AbortController();
    const loadMemoryTree = async () => {
      try {
        setIsMemoryLoading(true);
        setMemoryError(null);
        const data = await apiRequest<{ memoria: MemoryRecord[] }>(
          `/memoria/${user.id_user}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
          {
            requireAdmin: true,
            useFallbackAdmin: true,
          },
        );
        const mems = Array.isArray(data?.memoria) ? data.memoria : [];
        const tree = buildMemoryTree(mems);
        setMemoryTree(tree);
        const firstFile = findFirstFile(tree);
        setSelectedMemoryFile(firstFile);
      } catch (requestError) {
        if ((requestError as Error).name === "AbortError") return;
        setMemoryError("Não foi possível carregar as memórias.");
      } finally {
        setIsMemoryLoading(false);
      }
    };

    void loadMemoryTree();
    return () => controller.abort();
  }, [apiBaseUrl, user?.id_user]);

  const activeFile = selectedMemoryFile;

  useEffect(() => {
    if (!activeFile?.content) {
      setEditableLines([]);
      setSaveMessage(null);
      return;
    }

    const raw = activeFile.content.conteudo_raw;
    if (isStructuredJson(raw)) {
      const lines = collectEditableLines(raw);
      if (activeFile.content.origem === "estado") {
        setEditableLines(sortEditableLinesForEstado(lines));
      } else {
        setEditableLines(lines);
      }
    } else {
      setEditableLines([]);
    }
    setSaveMessage(null);
  }, [activeFile]);

  const handleSelectFile = (node: FileNode, path: string) => {
    setSelectedMemoryFile(node);
  };

  const handleSave = useCallback(async () => {
    if (!activeFile?.content || !user?.id_user || isSaving) return;

    const memoryId = Number(activeFile.content.id_memoria ?? 0);
    if (!memoryId) {
      setSaveMessage("Memória inválida para atualização.");
      return;
    }

    const rawBase = activeFile.content.conteudo_raw;
    if (!isStructuredJson(rawBase)) {
      setSaveMessage("Este arquivo não possui conteúdo JSON editável.");
      return;
    }

    const valueMap = Object.fromEntries(
      editableLines.map((line) => [
        line.path,
        valueRefs.current[line.path]?.innerText ?? primitiveToText(line.value),
      ]),
    );

    const rebuilt = applyEditedValues(rawBase, valueMap);
    if (rebuilt.ok === false) {
      setSaveMessage(rebuilt.error);
      return;
    }

    const parsed = rebuilt.value;

    if (!hasCompatibleStructure(rawBase, parsed)) {
      setSaveMessage("Somente valores podem ser alterados. Chaves, arrays e estrutura devem permanecer iguais.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveMessage(null);

      await apiRequest<{ updated: boolean }>(
        "/memoria/edit",
        {
          method: "POST",
          body: JSON.stringify({
            id_memoria: memoryId,
            id_user: user.id_user,
            conteudo: parsed,
          }),
        },
        {
          requireAdmin: true,
          useFallbackAdmin: true,
        },
      );

      setMemoryTree((prev) => updateMemoryNodeContent(prev, memoryId, parsed));
      setSelectedMemoryFile((prev) => {
        if (!prev?.content || prev.content.id_memoria !== memoryId) return prev;
        return {
          ...prev,
          content: {
            ...prev.content,
            conteudo_raw: parsed,
            conteudo: JSON.stringify(parsed, null, 2),
          },
        };
      });

      setSaveMessage("Alterações salvas.");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Não foi possível salvar as alterações.";
      setSaveMessage(message || "Não foi possível salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  }, [activeFile, editableLines, isSaving, user?.id_user]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      void handleSave();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  return (
    <div className="flex h-full animate-fade-in">
      {/* File Explorer */}
      <div className="w-56 border-r border-border surface-1 overflow-y-auto p-1.5 shrink-0">
        <div className="px-2 py-1.5 mb-1 border-b border-border">
          <span className="text-[10px] font-semibold text-alert uppercase tracking-[0.2em] font-mono">Explorer</span>
          <div className="mt-1 text-[9px] text-muted-foreground/80 font-mono break-all">
            FONTE: {`${apiBaseUrl}/memoria/${user?.id_user ?? 0}`}
          </div>
          <div className="text-[9px] text-muted-foreground/80 font-mono">
            NÓS: {memoryTree.length}
          </div>
        </div>
        {memoryTree.map((node) => (
          <FileTreeItem
            key={node.name}
            node={node}
            onSelect={(fileNode, pathFromNode) => {
              const resolvedPath = pathFromNode || findNodePath(memoryTree, fileNode) || fileNode.name;
              handleSelectFile(fileNode, resolvedPath);
            }}
            selectedFile={selectedMemoryFile?.name || null}
            nodePath={node.name}
          />
        ))}
      </div>

      {/* File Content */}
      <div className="flex-1 p-5 overflow-y-auto">
        <div className="mb-6">
          {user ? (
            <div className="flex flex-col gap-1 mb-2">
              <span className="text-xs font-mono text-muted-foreground">Usuário logado:</span>
              <span className="text-sm font-bold text-foreground">{user.nome} ({user.email})</span>
            </div>
          ) : (
            <span className="text-xs font-mono text-muted-foreground">Não autenticado</span>
          )}
        </div>
        {isMemoryLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">
            Carregando memórias...
          </div>
        ) : memoryError ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">
            {memoryError}
          </div>
        ) : activeFile?.content ? (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{activeFile.content.nome}</h2>
              {isSaving ? (
                <span className="text-[10px] text-muted-foreground font-mono">SALVANDO...</span>
              ) : saveMessage ? (
                <span className="text-[10px] text-muted-foreground font-mono">{saveMessage}</span>
              ) : (
                <span className="text-[10px] text-muted-foreground font-mono">CTRL+S PARA SALVAR</span>
              )}
              <button
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="text-[10px] px-2 py-1 border border-border text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                SALVAR
              </button>
              <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                MEMORIAS / DADOS
              </span>
            </div>
            {editableLines.length === 0 ? (
              <div className="text-xs text-muted-foreground font-mono">Arquivo vazio. Aguarde dados do sistema.</div>
            ) : (
              <div className="px-0 py-1">
                <div className="w-full min-h-[420px] bg-transparent text-xs text-foreground font-mono leading-relaxed outline-none border-0 p-0 space-y-0.5">
                  {editableLines.map((line) => (
                    <div key={line.path} className="flex items-start" style={{ paddingLeft: `${line.depth * 12}px` }}>
                      <span className="text-muted-foreground select-none">{line.label}:&nbsp;</span>
                      <span
                        ref={(element) => {
                          valueRefs.current[line.path] = element;
                        }}
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck={false}
                        className="flex-1 text-foreground outline-none"
                      >
                        {primitiveToText(line.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">
            Selecione um arquivo para visualizar.
          </div>
        )}
      </div>
    </div>
  );
}