export function formatarDataBr(dataIso) {
    if (!dataIso) {
        return "-";
    }
    const [ano, mes, dia] = dataIso.split("-");
    if (!ano || !mes || !dia) {
        return dataIso;
    }
    return `${dia}/${mes}/${ano}`;
}

export function aplicarMascaraTelefone(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);
    if (numeros.length <= 2) {
        return numeros;
    }
    if (numeros.length <= 6) {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }
    if (numeros.length <= 10) {
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

export function funcionarioAtivo(funcionario) {
    const temDataDispensa = Boolean(funcionario.dataDispensa);
    const temMotivoDispensa = Boolean(funcionario.motivoDispensa && funcionario.motivoDispensa.trim());
    return !temDataDispensa && !temMotivoDispensa;
}

export function funcionarioDispensado(funcionario) {
    const temDataDispensa = Boolean(funcionario.dataDispensa);
    const temMotivoDispensa = Boolean(funcionario.motivoDispensa && funcionario.motivoDispensa.trim());
    return temDataDispensa || temMotivoDispensa;
}

export function calcularTempoPermanencia(dataRegistro, dataDispensa) {
    if (!dataRegistro || !dataDispensa) {
        return "-";
    }

    const inicio = new Date(`${dataRegistro}T00:00:00`);
    const fim = new Date(`${dataDispensa}T00:00:00`);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) {
        return "-";
    }

    let anos = fim.getFullYear() - inicio.getFullYear();
    let meses = fim.getMonth() - inicio.getMonth();

    if (fim.getDate() < inicio.getDate()) {
        meses -= 1;
    }

    if (meses < 0) {
        anos -= 1;
        meses += 12;
    }

    if (anos <= 0) {
        return `${meses} mes(es)`;
    }

    return `${anos} ano(s) e ${meses} mes(es)`;
}

export const TIPOS_REGISTRO = {
    cadastro: { label: "Cadastro", classe: "bg-success" },
    observacao: { label: "Observacao", classe: "bg-secondary" },
    ferias: { label: "Ferias", classe: "bg-primary" },
    dispensa: { label: "Dispensa", classe: "bg-danger" },
    promocao: { label: "Promocao", classe: "bg-warning text-dark" },
    turno: { label: "Turno", classe: "bg-info text-dark" },
    edicao: { label: "Alteracao", classe: "bg-dark" }
};

export function criarRegistroHistorico(data, texto, tipo = "observacao") {
    return {
        data,
        texto,
        tipo,
        criadoEm: new Date().toISOString()
    };
}

export function ordenarHistorico(historico) {
    return [...(historico || [])].sort((a, b) => {
        const comparacaoData = (b.data || "").localeCompare(a.data || "");
        if (comparacaoData !== 0) {
            return comparacaoData;
        }
        return (b.criadoEm || "").localeCompare(a.criadoEm || "");
    });
}

export function obterLabelTipoRegistro(tipo) {
    return TIPOS_REGISTRO[tipo]?.label || "Registro";
}

export function obterClasseTipoRegistro(tipo) {
    return TIPOS_REGISTRO[tipo]?.classe || "bg-secondary";
}

export function obterDataHojeIso() {
    return new Date().toISOString().slice(0, 10);
}

export function calcularDiasAte(dataIso, dataReferencia = obterDataHojeIso()) {
    if (!dataIso) {
        return null;
    }
    const referencia = new Date(`${dataReferencia}T00:00:00`);
    const alvo = new Date(`${dataIso}T00:00:00`);
    if (Number.isNaN(referencia.getTime()) || Number.isNaN(alvo.getTime())) {
        return null;
    }
    return Math.round((alvo - referencia) / (1000 * 60 * 60 * 24));
}

export function classificarPeriodoFerias(ferias, hoje = obterDataHojeIso()) {
    if (!ferias?.dataInicio || !ferias?.dataFim) {
        return "invalido";
    }
    if (ferias.dataInicio <= hoje && hoje <= ferias.dataFim) {
        return "em_ferias";
    }
    if (ferias.dataInicio > hoje) {
        return "programada";
    }
    return "passada";
}

export function obterInfoAlertaFerias(diasAteInicio) {
    if (diasAteInicio === null) {
        return { classe: "secondary", texto: "-", destaque: false };
    }
    if (diasAteInicio <= 0) {
        return { classe: "danger", texto: "Inicia hoje!", destaque: true };
    }
    if (diasAteInicio <= 3) {
        return { classe: "danger", texto: `Faltam ${diasAteInicio} dia(s)`, destaque: true };
    }
    if (diasAteInicio <= 7) {
        return { classe: "warning text-dark", texto: `Faltam ${diasAteInicio} dias`, destaque: true };
    }
    if (diasAteInicio <= 14) {
        return { classe: "info text-dark", texto: `Faltam ${diasAteInicio} dias`, destaque: true };
    }
    if (diasAteInicio <= 30) {
        return { classe: "primary", texto: `Faltam ${diasAteInicio} dias`, destaque: false };
    }
    return { classe: "secondary", texto: `Em ${diasAteInicio} dias`, destaque: false };
}

export function identificarFerias(ferias) {
    if (ferias.id) {
        return ferias.id;
    }
    return `${ferias.dataInicio}|${ferias.dataFim}|${ferias.observacao || ""}`;
}

export function coletarPeriodosFerias(funcionarios) {
    const periodos = [];
    funcionarios.forEach((funcionario) => {
        const historico = Array.isArray(funcionario.historicoFerias) ? funcionario.historicoFerias : [];
        historico.forEach((ferias) => {
            periodos.push({ funcionario, ferias });
        });
    });
    return periodos;
}

export function criarPeriodoFerias(dataInicio, dataFim, observacao = "") {
    return {
        id: crypto.randomUUID(),
        dataInicio,
        dataFim,
        observacao
    };
}

export function calcularTempoEmpresa(dataRegistro) {
    if (!dataRegistro) {
        return "-";
    }

    const inicio = new Date(`${dataRegistro}T00:00:00`);
    const hoje = new Date();

    if (Number.isNaN(inicio.getTime()) || inicio > hoje) {
        return "-";
    }

    let anos = hoje.getFullYear() - inicio.getFullYear();
    let meses = hoje.getMonth() - inicio.getMonth();

    if (hoje.getDate() < inicio.getDate()) {
        meses -= 1;
    }
    if (meses < 0) {
        anos -= 1;
        meses += 12;
    }

    if (anos <= 0) {
        return `${meses} mes(es)`;
    }
    return `${anos} ano(s) e ${meses} mes(es)`;
}
