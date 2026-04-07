//==========================================================================================================================

//==========================================================================================================================

function prepararMemorias(memorias) {
    const memoriaMap = {};
    const raiz = [];

    // Primeiro, crie um mapa de memórias por ID
    memorias.forEach(memoria => {
        memoriaMap[memoria.id_memoria] = { ...memoria, filhos: [] };
    });
    
    // Em seguida, construa a árvore de memórias
    Object.values(memoriaMap).forEach(memoria => {
        if (memoria.id_memoria_pai) {
            const pai = memoriaMap[memoria.id_memoria_pai];
            if (pai) {
                pai.filhos.push(memoria);
            } else {
                console.warn(`Memória pai não encontrada para ID: ${memoria.id_memoria_pai}`);
                raiz.push(memoria); // Se o pai não for encontrado, adicione à raiz
            }
        } else {
            raiz.push(memoria); // Memórias sem pai são adicionadas à raiz
        }
    });

    return exibirMemorias(raiz);
}

//==========================================================================================================================

function exibirMemorias(memorias = []) {
    const tree = [
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

    //---------------------------------------------------------------------------------------------------------------------

    for (let i = 0; i < memorias.length; i += 1) {
        const memoria = memorias[i] || {};
        const nome = String(memoria.nome || `memoria_${i + 1}`).trim() || `memoria_${i + 1}`;
        const tipo = String(memoria.tipo || "").trim().toLowerCase();
        const subtipo = String(memoria.subtipo || "").trim().toLowerCase();

        const fileNode = {
            name: nome,
            type: "file",
            content: {
                nome,
                tipo,
                subtipo,
                conteudo: memoria.conteudo ?? null,
            },
        };

        let destino = null;

        if (tipo === "perfil") {
            const perfil = tree[0];
            const alvo = subtipo === "anatomico" ? "anatomico" : subtipo === "fisiologico" ? "fisiologico" : "psicologico";
            destino = perfil.children.find((child) => child.name === alvo)?.children || perfil.children[2].children;
        } else if (tipo === "estado") {
            destino = tree[1].children;
        } else if (tipo === "bruta" && subtipo === "treino") {
            destino = tree[2].children.find((child) => child.name === "treinos")?.children || tree[2].children[0].children;
        } else if (tipo === "interpretada" && subtipo === "hipotese") {
            destino = tree[3].children.find((child) => child.name === "hipoteses")?.children || tree[3].children[0].children;
        } else if (tipo === "interpretada") {
            destino = tree[3].children.find((child) => child.name === "notas")?.children || tree[3].children[1].children;
        } else {
            destino = tree[2].children.find((child) => child.name === "notas")?.children || tree[2].children[1].children;
        }

        destino.push(fileNode);
    }

    //---------------------------------------------------------------------------------------------------------------------

    for (const folder of tree) {
        for (const child of folder.children || []) {
            if (child.type === "folder") {
                child.children.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
            }
        }
        if (folder.name === "estado") {
            folder.children.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
        }
    }

    //---------------------------------------------------------------------------------------------------------------------

    return tree;
}

export async function edit_memory({ id_memoria, id_user, conteudo }) {
    const memoryId = Number(id_memoria);
    const userId = Number(id_user);

    if (!memoryId || !userId) {
        throw new Error("id_memoria e id_user são obrigatórios.");
    }

    if (conteudo === undefined) {
        throw new Error("conteudo é obrigatório.");
    }

    return {
        id_memoria: memoryId,
        id_user: userId,
        conteudo,
    };
}

export { prepararMemorias, exibirMemorias };