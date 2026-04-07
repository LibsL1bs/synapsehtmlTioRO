const SLEEP_KEYS = [
    ['sono-segunda', 'sono-seg'],
    ['sono-terca', 'sono-ter'],
    ['sono-quarta', 'sono-qua'],
    ['sono-quinta', 'sono-qui'],
    ['sono-sexta', 'sono-sex'],
    ['sono-sabado', 'sono-sab'],
    ['sono-domingo', 'sono-dom'],
];

const SLEEP_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const LIFT_KEYS = ['BP', 'squat', 'DL'];

const normalizeKey = (key) =>
    String(key || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

function toObject(valor) {
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) return valor;
    return {};
}

function readByKeys(conteudo, keys) {
    const entries = Object.entries(conteudo || {});
    const normalized = new Map(entries.map(([k, v]) => [normalizeKey(k), v]));

    for (const key of keys) {
        if (key in conteudo) return conteudo[key];
        const candidate = normalized.get(normalizeKey(key));
        if (candidate !== undefined) return candidate;
    }
    return undefined;
}

function toNumber(valor) {
    if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
    if (typeof valor !== 'string') return null;
    const normalized = valor.trim().replace(',', '.');
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;

    const matched = normalized.match(/-?\d+(?:\.\d+)?/);
    if (!matched) return null;
    const extracted = Number(matched[0]);
    return Number.isFinite(extracted) ? extracted : null;
}

function toStringOrEmpty(valor) {
    if (valor == null) return '';
    return String(valor);
}

function toTrendFromDelta(delta) {
    if (delta > 0.01) return 'up';
    if (delta < -0.01) return 'down';
    return 'stable';
}

function calcSleepAlert(value) {
    if (value == null) return 'high';
    if (value < 6) return 'low';
    if (value < 7) return 'medium';
    return 'high';
}

function calcFatigueAlert(value) {
    if (value == null) return 'high';
    if (value < 60) return 'low';
    if (value <= 75) return 'medium';
    return 'high';
}

function payloadVazio() {
    return {
        updated_at: '',
        readiness: null,
        semana: '—',
        bloco: '—',
        metrics: {
            alimentacao: { value: null, unit: 'kcal', alertLevel: 'high', indicators: [] },
            sono: { value: null, unit: 'horas', alertLevel: 'high', indicators: [] },
            fadiga: { value: null, trend: 'stable', status: 'warning', alertLevel: 'high' },
            tendencia: { indicators: [], alertLevel: 'medium' },
        },
        nextWorkout: { title: '', statusLabel: '', target: '', duration: '', exercises: [] },
    };
}

function carregarDashboardEstado(rows = []) {
    if (rows.length === 0) return payloadVazio();

    const historico = rows.map((row) => ({
        data: row.data_mod,
        conteudo: normalizarConteudo(row.conteudo),
    }));

    const atual = toObject(historico[0].conteudo);
    const anterior = toObject(historico[1]?.conteudo ?? {});
    const proximoTreino = toObject(readByKeys(atual, ['proximo_treino', 'próximo_treino', 'nextWorkout', 'next_workout']));

    const readiness = toNumber(readByKeys(atual, ['readiness', 'prontidao', 'estado_readiness']));
    const semana = readByKeys(atual, ['semana']);
    const bloco = readByKeys(atual, ['bloco']);

    const calorias = toNumber(readByKeys(atual, ['calorias']));
    const carboidratos = toNumber(readByKeys(atual, ['carboidratos']));
    const proteinas = toNumber(readByKeys(atual, ['proteinas']));

    const sleepValues = SLEEP_KEYS.map((keys) => toNumber(readByKeys(atual, keys)));
    const validSleepValues = sleepValues.filter((v) => v !== null);
    const sonoMedia = validSleepValues.length
        ? Number((validSleepValues.reduce((acc, val) => acc + val, 0) / validSleepValues.length).toFixed(1))
        : toNumber(readByKeys(atual, ['sono']));

    const fadiga = toNumber(readByKeys(atual, ['fadiga_neural_aproximada', 'fadiga neural aproximada', 'posterior_de_coxa', 'posterior de coxa']));

    const liftIndicators = LIFT_KEYS.map((lift) => {
        const current = toNumber(readByKeys(atual, [lift]));
        const prev = toNumber(readByKeys(anterior, [lift]));
        const trend = current != null && prev != null ? toTrendFromDelta(current - prev) : 'stable';
        return {
            label: `${lift} 1RM`,
            value: current != null ? `${current.toLocaleString('pt-BR')} kg` : '--',
            trend,
        };
    });

    const downCount = liftIndicators.filter((item) => item.trend === 'down').length;
    const stableCount = liftIndicators.filter((item) => item.trend === 'stable').length;
    const trendAlertLevel = downCount >= 2 ? 'low' : stableCount >= 2 ? 'medium' : 'high';

    return {
        updated_at: historico[0].data ? new Date(historico[0].data).toISOString() : '',
        readiness,
        semana: semana ?? '—',
        bloco: bloco ?? '—',
        metrics: {
            alimentacao: {
                value: calorias,
                unit: 'kcal',
                alertLevel: 'high',
                indicators: [
                    { label: 'Carboidratos', value: carboidratos != null ? `${carboidratos.toLocaleString('pt-BR')} g` : '--' },
                    { label: 'Proteínas', value: proteinas != null ? `${proteinas.toLocaleString('pt-BR')} g` : '--' },
                ],
            },
            sono: {
                value: sonoMedia,
                unit: 'horas',
                alertLevel: calcSleepAlert(sonoMedia),
                indicators: sleepValues
                    .map((v, i) => ({ label: SLEEP_LABELS[i], value: v != null ? `${v.toLocaleString('pt-BR')}h` : null }))
                    .filter((item) => item.value !== null)
                    .map((item) => ({ ...item, tone: 'darker' })),
            },
            fadiga: {
                value: fadiga,
                trend: 'stable',
                status: 'warning',
                alertLevel: calcFatigueAlert(fadiga),
            },
            tendencia: {
                indicators: liftIndicators,
                alertLevel: trendAlertLevel,
            },
        },
        nextWorkout: {
            title: toStringOrEmpty(proximoTreino.title),
            statusLabel: toStringOrEmpty(proximoTreino.statusLabel),
            target: toStringOrEmpty(proximoTreino.target),
            duration: toStringOrEmpty(proximoTreino.duration),
            exercises: [],
        },
    };
}


// Garante que conteudo sempre seja um objeto valido.

function normalizarConteudo(valor) {
    if (valor !== null && typeof valor === 'object') return valor;
    if (valor == null) return {};

    if (typeof valor === 'string') {
        const texto = valor.trim();
        if (!texto) return {};
        try {
            const parsed = JSON.parse(texto);
            return (parsed !== null && typeof parsed === 'object') ? parsed : { valor: parsed };
        } catch {
            return { valor: texto };
        }
    }

    return { valor };
}


export { carregarDashboardEstado };
